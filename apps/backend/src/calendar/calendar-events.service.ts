import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { BlockDailyPlanCalendarResponse } from '@squeaky-wheel/shared-types';
import { DRIZZLE, type Database } from '../db/database.module';
import { dailyPlanTasks, dailyPlans, tasks } from '../db/schema';
import { buildMockCalendarAvailability } from '../llm/mock-daily-proposal';
import { CalendarConnectionService } from './calendar-connection.service';
import { CalendarProviderService } from './calendar-provider.service';

@Injectable()
export class CalendarEventsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly connections: CalendarConnectionService,
    private readonly provider: CalendarProviderService,
  ) {}

  async blockEventsForDailyPlan(
    userId: string,
    planId: string,
  ): Promise<BlockDailyPlanCalendarResponse> {
    const connection = await this.ensureConnection(userId);

    const plan = await this.db.query.dailyPlans.findFirst({
      where: and(eq(dailyPlans.id, planId), eq(dailyPlans.userId, userId)),
    });

    if (!plan) {
      throw new NotFoundException('Daily plan not found');
    }

    const planTasks = await this.db.query.dailyPlanTasks.findMany({
      where: eq(dailyPlanTasks.dailyPlanId, plan.id),
      orderBy: (table, { asc }) => [asc(table.slot)],
    });

    if (planTasks.length !== 3) {
      throw new BadRequestException('Daily plan must have exactly 3 tasks to block calendar time');
    }

    const taskRows = await Promise.all(
      planTasks.map(async (row) => {
        const task = await this.db.query.tasks.findFirst({
          where: eq(tasks.id, row.taskId),
        });
        if (!task) {
          throw new NotFoundException(`Task ${row.taskId} not found`);
        }
        return { planTask: row, task };
      }),
    );

    const durations = taskRows.map(({ task }) => task.estimatedMinutes ?? 45);
    const slots = buildMockCalendarAvailability(plan.planDate, durations);
    const calendarId = connection.externalCalendarId ?? 'primary';
    const events: BlockDailyPlanCalendarResponse['events'] = [];

    for (let index = 0; index < taskRows.length; index++) {
      const { planTask, task } = taskRows[index];
      const slot = slots[index];

      if (planTask.calendarEventId) {
        events.push({
          dailyPlanTaskId: planTask.id,
          taskId: task.id,
          slot: planTask.slot,
          calendarEventId: planTask.calendarEventId,
          start: slot.start,
          end: slot.end,
        });
        continue;
      }

      const calendarEventId = await this.provider.createCalendarEvent({
        accessToken: connection.accessToken,
        calendarId,
        title: task.title,
        start: slot.start,
        end: slot.end,
        description: planTask.rationale ?? undefined,
      });

      await this.db
        .update(dailyPlanTasks)
        .set({ calendarEventId })
        .where(eq(dailyPlanTasks.id, planTask.id));

      events.push({
        dailyPlanTaskId: planTask.id,
        taskId: task.id,
        slot: planTask.slot,
        calendarEventId,
        start: slot.start,
        end: slot.end,
      });
    }

    return { planId: plan.id, events };
  }

  private async ensureConnection(userId: string) {
    const existing = await this.connections.getConnectionForUser(userId);
    if (existing) {
      return existing;
    }

    if (this.provider.getMode() === 'mock') {
      const tokens = await this.provider.exchangeCodeForTokens('mock');
      return this.connections.upsertGoogleConnection(userId, tokens);
    }

    throw new BadRequestException(
      'Calendar is not connected. Complete OAuth before blocking time.',
    );
  }
}
