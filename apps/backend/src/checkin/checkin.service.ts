import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { TodayCheckinResponse } from '@squeaky-wheel/shared-types';
import { AntiStallService } from '../anti-stall/anti-stall.service';
import { CalendarEventsService } from '../calendar/calendar-events.service';
import { DRIZZLE, type Database } from '../db/database.module';
import { dailyPlanTasks, dailyPlans, tasks, ventures } from '../db/schema';
import { DailyProposalService } from '../llm/daily-proposal.service';
import { buildMockCalendarAvailability } from '../llm/mock-daily-proposal';
import { OrchestratorTraceService } from '../llm/orchestrator-trace.service';

@Injectable()
export class CheckinService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly dailyProposalService: DailyProposalService,
    private readonly antiStallService: AntiStallService,
    private readonly traceService: OrchestratorTraceService,
    private readonly calendarEventsService: CalendarEventsService,
  ) {}

  async getToday(userId: string): Promise<TodayCheckinResponse> {
    const planDate = formatDate(new Date());
    const existing = await this.loadExistingPlan(userId, planDate);
    if (existing) {
      return existing;
    }
    return this.dailyProposalService.proposeToday(userId, planDate);
  }

  async replanToday(userId: string): Promise<TodayCheckinResponse> {
    const planDate = formatDate(new Date());
    const plan = await this.db.query.dailyPlans.findFirst({
      where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate)),
    });

    if (plan) {
      await this.db.delete(dailyPlanTasks).where(eq(dailyPlanTasks.dailyPlanId, plan.id));
      await this.db.delete(dailyPlans).where(eq(dailyPlans.id, plan.id));
    }

    return this.dailyProposalService.proposeToday(userId, planDate);
  }

  async confirmToday(userId: string): Promise<TodayCheckinResponse> {
    const planDate = formatDate(new Date());

    const { result, traceId } = await this.traceService.runTraced({
      flow: 'daily_proposal',
      userId,
      input: { action: 'confirm', planDate },
      fn: async (activeTraceId) => {
        const plan = await this.db.query.dailyPlans.findFirst({
          where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate)),
        });

        if (!plan) {
          throw new NotFoundException('No daily plan found for today');
        }

        if (plan.status === 'confirmed' || plan.status === 'completed') {
          this.traceService.addStep(activeTraceId, 'already_confirmed', { planId: plan.id });
          await this.ensureCalendarBlocked(userId, plan.id, activeTraceId);
          const existing = await this.loadExistingPlan(userId, planDate);
          if (!existing) {
            throw new NotFoundException('Daily plan could not be loaded');
          }
          return existing;
        }

        const planTasks = await this.db.query.dailyPlanTasks.findMany({
          where: eq(dailyPlanTasks.dailyPlanId, plan.id),
          orderBy: (table, { asc }) => [asc(table.slot)],
        });

        if (planTasks.length !== 3) {
          throw new BadRequestException('Daily plan must have exactly 3 tasks before confirming');
        }

        const taskIds = planTasks.map((row) => row.taskId);
        await this.db
          .update(dailyPlans)
          .set({ status: 'confirmed' })
          .where(eq(dailyPlans.id, plan.id));

        await this.db
          .update(tasks)
          .set({ status: 'scheduled', updatedAt: new Date() })
          .where(inArray(tasks.id, taskIds));

        this.traceService.addStep(activeTraceId, 'plan_confirmed', {
          planId: plan.id,
          taskIds,
        });

        try {
          await this.ensureCalendarBlocked(userId, plan.id, activeTraceId);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.traceService.addStep(activeTraceId, 'calendar_block_failed', { message });
          throw error;
        }

        const loaded = await this.loadExistingPlan(userId, planDate);
        if (!loaded) {
          throw new NotFoundException('Daily plan could not be loaded after confirm');
        }

        return {
          ...loaded,
          assistantMessage:
            "Locked in. I've blocked time on your calendar for all 3.",
        };
      },
      toOutput: (result) => ({
        planId: result.planId,
        status: result.status,
        taskCount: result.proposedTasks.length,
      }),
    });

    return { ...result, traceId };
  }

  private async ensureCalendarBlocked(userId: string, planId: string, traceId: string) {
    const planTasks = await this.db.query.dailyPlanTasks.findMany({
      where: eq(dailyPlanTasks.dailyPlanId, planId),
    });

    if (planTasks.length === 0) {
      return;
    }

    const needsBlock = planTasks.some((row) => !row.calendarEventId);
    if (!needsBlock) {
      return;
    }

    const blocked = await this.calendarEventsService.blockEventsForDailyPlan(userId, planId);
    this.traceService.addStep(traceId, 'calendar_blocked', {
      eventCount: blocked.events.length,
      eventIds: blocked.events.map((event) => event.calendarEventId),
    });
  }

  private async loadExistingPlan(
    userId: string,
    planDate: string,
  ): Promise<TodayCheckinResponse | null> {
    const plan = await this.db.query.dailyPlans.findFirst({
      where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate)),
    });

    if (!plan) {
      return null;
    }

    const planTasks = await this.db.query.dailyPlanTasks.findMany({
      where: eq(dailyPlanTasks.dailyPlanId, plan.id),
      orderBy: (table, { asc }) => [asc(table.slot)],
    });

    if (planTasks.length === 0) {
      return null;
    }

    const taskIds = planTasks.map((row) => row.taskId);
    const taskRows = await this.db.query.tasks.findMany({
      where: inArray(tasks.id, taskIds),
    });
    const taskById = new Map(taskRows.map((task) => [task.id, task]));

    const ventureIds = [...new Set(taskRows.map((task) => task.ventureId))];
    const ventureRows = await this.db.query.ventures.findMany({
      where: inArray(ventures.id, ventureIds),
    });
    const ventureNameById = new Map(ventureRows.map((v) => [v.id, v.name]));

    const antiStall = await this.antiStallService.getScoresForUser(userId, planDate);
    const durations = planTasks.map((row) => {
      const task = taskById.get(row.taskId);
      return task?.estimatedMinutes ?? 45;
    });
    const calendarSlots = buildMockCalendarAvailability(planDate, durations);

    const proposedTasks = planTasks.map((row, index) => {
      const task = taskById.get(row.taskId);
      if (!task) {
        throw new Error(`Task ${row.taskId} missing for daily plan`);
      }

      const calendarSlot = calendarSlots[index];
      return {
        slot: row.slot as 1 | 2 | 3,
        taskId: task.id,
        title: task.title,
        ventureId: task.ventureId,
        ventureName: ventureNameById.get(task.ventureId) ?? 'Unknown venture',
        estimatedMinutes: task.estimatedMinutes ?? 45,
        rationale: row.rationale ?? '',
        proposedStartTime: calendarSlot?.start ?? null,
        proposedEndTime: calendarSlot?.end ?? null,
        calendarEventId: row.calendarEventId,
        outcome: (row.outcome as 'done' | 'not_done' | 'partial' | null) ?? null,
      };
    });

    const isConfirmed = plan.status === 'confirmed' || plan.status === 'completed';

    return {
      traceId: 'loaded-from-db',
      planId: plan.id,
      planDate,
      status: plan.status as TodayCheckinResponse['status'],
      outputMethod: 'mock',
      assistantMessage: isConfirmed
        ? "Locked in. I've blocked time on your calendar for all 3."
        : "Good morning. Here's what I'm proposing for today:",
      antiStall,
      calendarAvailability: calendarSlots,
      proposedTasks,
    };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
