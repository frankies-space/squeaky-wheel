import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type {
  CompleteEveningCheckinRequest,
  DailyPlanTaskOutcome,
  EveningCheckinResponse,
  EveningTaskDisposition,
  EveningTaskReviewItem,
} from '@squeaky-wheel/shared-types';
import { AntiStallService } from '../anti-stall/anti-stall.service';
import { DRIZZLE, type Database } from '../db/database.module';
import {
  checkinMessages,
  checkins,
  dailyPlanTasks,
  dailyPlans,
  tasks,
  ventures,
} from '../db/schema';

@Injectable()
export class EveningCheckinService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly antiStallService: AntiStallService,
  ) {}

  async getEvening(userId: string): Promise<EveningCheckinResponse> {
    const planDate = formatDate(new Date());
    const plan = await this.requireConfirmedPlan(userId, planDate);
    const checkin = await this.findOrCreateEveningSession(userId, plan.id);
    const reviewTasks = await this.loadReviewTasks(plan.id);

    return {
      checkinId: checkin.id,
      planId: plan.id,
      planDate,
      status: checkin.status as EveningCheckinResponse['status'],
      assistantMessage: buildAssistantMessage(checkin.status, reviewTasks),
      tasks: reviewTasks,
    };
  }

  async completeEvening(
    userId: string,
    body: CompleteEveningCheckinRequest,
  ): Promise<EveningCheckinResponse> {
    const planDate = formatDate(new Date());
    const plan = await this.requireConfirmedPlan(userId, planDate);
    const checkin = await this.findOrCreateEveningSession(userId, plan.id);

    if (checkin.status === 'completed') {
      return this.getEvening(userId);
    }

    const planTasks = await this.db.query.dailyPlanTasks.findMany({
      where: eq(dailyPlanTasks.dailyPlanId, plan.id),
      orderBy: (table, { asc }) => [asc(table.slot)],
    });

    if (planTasks.length !== 3) {
      throw new BadRequestException('Evening review requires exactly 3 daily tasks');
    }

    const outcomes = body.outcomes ?? [];
    if (outcomes.length !== 3) {
      throw new BadRequestException('Must submit exactly 3 task outcomes');
    }

    const planTaskById = new Map(planTasks.map((row) => [row.taskId, row]));
    const seen = new Set<string>();

    for (const item of outcomes) {
      if (seen.has(item.taskId)) {
        throw new BadRequestException(`Duplicate outcome for task ${item.taskId}`);
      }
      seen.add(item.taskId);

      if (!planTaskById.has(item.taskId)) {
        throw new BadRequestException(`Task ${item.taskId} is not on today's plan`);
      }

      validateOutcomeItem(item.outcome, item.disposition);
    }

    const taskRows = await this.db.query.tasks.findMany({
      where: inArray(
        tasks.id,
        planTasks.map((row) => row.taskId),
      ),
    });
    const taskById = new Map(taskRows.map((task) => [task.id, task]));

    const attendedVentureIds = new Set<string>();

    for (const item of outcomes) {
      const planTask = planTaskById.get(item.taskId)!;
      const task = taskById.get(item.taskId);
      if (!task) {
        throw new NotFoundException(`Task ${item.taskId} not found`);
      }

      await this.db
        .update(dailyPlanTasks)
        .set({ outcome: item.outcome })
        .where(eq(dailyPlanTasks.id, planTask.id));

      const nextStatus = resolveTaskStatus(item.outcome, item.disposition);
      await this.db
        .update(tasks)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(tasks.id, task.id));

      if (item.outcome === 'done' || item.outcome === 'partial') {
        attendedVentureIds.add(task.ventureId);
      }
    }

    for (const ventureId of attendedVentureIds) {
      await this.antiStallService.recordAttention(
        userId,
        ventureId,
        plan.id,
        planDate,
      );
    }

    await this.db
      .update(dailyPlans)
      .set({ status: 'completed' })
      .where(eq(dailyPlans.id, plan.id));

    await this.db
      .update(checkins)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(checkins.id, checkin.id));

    const summary = summarizeOutcomes(outcomes);
    await this.db.insert(checkinMessages).values([
      {
        checkinId: checkin.id,
        role: 'user',
        content: summary,
      },
      {
        checkinId: checkin.id,
        role: 'assistant',
        content: buildClosingMessage(outcomes),
      },
    ]);

    return this.getEvening(userId);
  }

  private async requireConfirmedPlan(userId: string, planDate: string) {
    const plan = await this.db.query.dailyPlans.findFirst({
      where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate)),
    });

    if (!plan) {
      throw new NotFoundException('No daily plan found for today');
    }

    if (plan.status !== 'confirmed' && plan.status !== 'completed') {
      throw new BadRequestException(
        'Evening check-in requires a confirmed morning plan',
      );
    }

    return plan;
  }

  private async findOrCreateEveningSession(userId: string, dailyPlanId: string) {
    const existing = await this.db.query.checkins.findFirst({
      where: and(
        eq(checkins.userId, userId),
        eq(checkins.dailyPlanId, dailyPlanId),
        eq(checkins.type, 'evening'),
      ),
      orderBy: (table, { desc }) => [desc(table.startedAt)],
    });

    if (existing) {
      return existing;
    }

    const [created] = await this.db
      .insert(checkins)
      .values({
        userId,
        dailyPlanId,
        type: 'evening',
        status: 'in_progress',
      })
      .returning();

    return created;
  }

  private async loadReviewTasks(planId: string): Promise<EveningTaskReviewItem[]> {
    const planTasks = await this.db.query.dailyPlanTasks.findMany({
      where: eq(dailyPlanTasks.dailyPlanId, planId),
      orderBy: (table, { asc }) => [asc(table.slot)],
    });

    if (planTasks.length === 0) {
      return [];
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

    return planTasks.map((row) => {
      const task = taskById.get(row.taskId);
      if (!task) {
        throw new Error(`Task ${row.taskId} missing for daily plan`);
      }

      return {
        slot: row.slot as 1 | 2 | 3,
        taskId: task.id,
        title: task.title,
        ventureId: task.ventureId,
        ventureName: ventureNameById.get(task.ventureId) ?? 'Unknown venture',
        estimatedMinutes: task.estimatedMinutes ?? 45,
        rationale: row.rationale ?? '',
        calendarEventId: row.calendarEventId,
        outcome: (row.outcome as DailyPlanTaskOutcome | null) ?? null,
      };
    });
  }
}

function validateOutcomeItem(
  outcome: DailyPlanTaskOutcome,
  disposition: EveningTaskDisposition | undefined,
) {
  if (outcome === 'not_done' && !disposition) {
    throw new BadRequestException(
      'disposition (tomorrow|backlog) is required when outcome is not_done',
    );
  }

  if (outcome === 'done' && disposition) {
    throw new BadRequestException('disposition is not allowed when outcome is done');
  }
}

function resolveTaskStatus(
  outcome: DailyPlanTaskOutcome,
  disposition: EveningTaskDisposition | undefined,
): string {
  if (outcome === 'done') {
    return 'done';
  }

  if (disposition === 'tomorrow') {
    return 'rescheduled';
  }

  // not_done/partial → backlog by default (or explicit backlog disposition)
  return 'backlog';
}

function buildAssistantMessage(
  status: string,
  tasks: EveningTaskReviewItem[],
): string {
  if (status === 'completed') {
    return buildClosingMessage(
      tasks
        .filter((task) => task.outcome)
        .map((task) => ({
          taskId: task.taskId,
          outcome: task.outcome!,
        })),
    );
  }

  return "Evening check-in — how did today's 3 go? Tap done / partial / not done under each card.";
}

function buildClosingMessage(
  outcomes: Array<{ outcome: DailyPlanTaskOutcome }>,
): string {
  const done = outcomes.filter((o) => o.outcome === 'done').length;
  const partial = outcomes.filter((o) => o.outcome === 'partial').length;
  const notDone = outcomes.filter((o) => o.outcome === 'not_done').length;
  return `Logged: ${done} done, ${partial} partial, ${notDone} not done. Nice wrap-up — see you tomorrow.`;
}

function summarizeOutcomes(
  outcomes: Array<{ taskId: string; outcome: DailyPlanTaskOutcome; disposition?: string }>,
): string {
  return outcomes
    .map((item) => {
      const suffix = item.disposition ? ` → ${item.disposition}` : '';
      return `${item.taskId.slice(0, 8)}…: ${item.outcome}${suffix}`;
    })
    .join('; ');
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
