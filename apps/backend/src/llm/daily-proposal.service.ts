import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { generateText, tool } from 'ai';
import type { TodayCheckinResponse } from '@squeaky-wheel/shared-types';
import { AntiStallService } from '../anti-stall/anti-stall.service';
import { DRIZZLE, type Database } from '../db/database.module';
import { dailyPlanTasks, dailyPlans, tasks, ventures } from '../db/schema';
import { buildDailyProposalContext, getDailyProposalSystemPrompt } from './daily-proposal-context';
import {
  type PersistedDailyProposal,
  summarizeProposalOutput,
  toTodayCheckinResponse,
} from './daily-proposal.types';
import {
  buildMockCalendarAvailability,
  buildMockDailyProposal,
} from './mock-daily-proposal';
import { OrchestratorTraceService } from './orchestrator-trace.service';
import { LlmProviderService } from './provider';
import {
  assertExactlyThreeTasks,
  PROPOSE_DAILY_TASKS_TOOL_DESCRIPTION,
  proposeDailyTasksInputSchema,
  type ProposeDailyTasksInput,
} from './tools/propose-daily-tasks';

@Injectable()
export class DailyProposalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly antiStallService: AntiStallService,
    private readonly llmProvider: LlmProviderService,
    private readonly traceService: OrchestratorTraceService,
  ) {}

  async proposeToday(userId: string, planDate = formatDate(new Date())): Promise<TodayCheckinResponse> {
    const mode = this.llmProvider.getMode();

    const { result, traceId } = await this.traceService.runTraced({
      flow: 'daily_proposal',
      userId,
      input: { planDate, llmMode: mode },
      outputMethod: mode === 'mock' ? 'mock' : 'tool_call',
      fn: async (activeTraceId) => {
        const antiStall = await this.antiStallService.getScoresForUser(userId, planDate);
        this.traceService.addStep(activeTraceId, 'anti_stall_scored', {
          ventureCount: antiStall.scores.length,
          eligibleCount: antiStall.scores.filter((s) => s.isEligible).length,
        });

        const backlogByVenture = await this.loadBacklogByVenture(userId);
        this.traceService.addStep(activeTraceId, 'backlog_loaded', {
          venturesWithTasks: backlogByVenture.size,
        });

        const proposalInput =
          mode === 'mock'
            ? buildMockDailyProposal(antiStall, backlogByVenture)
            : await this.generateProposalWithLlm(
                planDate,
                antiStall,
                backlogByVenture,
                activeTraceId,
              );

        assertExactlyThreeTasks(proposalInput.tasks.length);

        const calendarSlots = buildMockCalendarAvailability(
          planDate,
          proposalInput.tasks.map((task) => task.estimatedMinutes),
        );
        this.traceService.addStep(activeTraceId, 'calendar_resolved', {
          slotCount: calendarSlots.length,
          source: 'mock',
        });

        const persisted = await this.persistProposal(
          userId,
          planDate,
          proposalInput,
          antiStall,
          calendarSlots,
          mode === 'mock' ? 'mock' : 'tool_call',
        );
        this.traceService.addStep(activeTraceId, 'plan_persisted', {
          planId: persisted.planId,
          taskCount: persisted.proposedTasks.length,
        });

        return persisted;
      },
      toOutput: summarizeProposalOutput,
    });

    return toTodayCheckinResponse(traceId, result);
  }

  validateProposalTaskCount(taskCount: number): void {
    try {
      assertExactlyThreeTasks(taskCount);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid task count',
      );
    }
  }

  private async generateProposalWithLlm(
    planDate: string,
    antiStall: Awaited<ReturnType<AntiStallService['getScoresForUser']>>,
    backlogByVenture: Map<string, { id: string; title: string; estimatedMinutes: number | null }[]>,
    traceId: string,
  ): Promise<ProposeDailyTasksInput> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER is not mock',
      );
    }

    const durations = [45, 45, 45];
    const calendarSlots = buildMockCalendarAvailability(planDate, durations);
    const backlogSummary = antiStall.scores.map((score) => ({
      ventureId: score.ventureId,
      ventureName: score.ventureName,
      tasks: (backlogByVenture.get(score.ventureId) ?? []).map((task) => task.title),
    }));

    const contextBlock = buildDailyProposalContext({
      planDate,
      antiStall,
      calendarSlots,
      backlogSummary,
    });

    this.traceService.addStep(traceId, 'llm_request_started', { planDate });

    const result = await generateText({
      model: this.llmProvider.getModel(),
      system: `${getDailyProposalSystemPrompt()}\n\n${contextBlock}`,
      prompt:
        'Propose exactly three tasks for today using the propose_daily_tasks tool. Respect anti-stall urgency. Return ONLY via the tool.',
      tools: {
        propose_daily_tasks: tool({
          description: PROPOSE_DAILY_TASKS_TOOL_DESCRIPTION,
          inputSchema: proposeDailyTasksInputSchema,
        }),
      },
      toolChoice: { type: 'tool', toolName: 'propose_daily_tasks' },
    });

    const toolCall = result.toolCalls.find((call) => call.toolName === 'propose_daily_tasks');
    if (!toolCall) {
      throw new ServiceUnavailableException(
        'Model did not return a propose_daily_tasks tool call',
      );
    }

    const parsed = proposeDailyTasksInputSchema.parse(toolCall.input);
    this.traceService.addStep(traceId, 'llm_tool_call_received', {
      taskCount: parsed.tasks.length,
    });

    return parsed;
  }

  private async loadBacklogByVenture(userId: string) {
    const userVentures = await this.db.query.ventures.findMany({
      where: eq(ventures.userId, userId),
    });
    const ventureIds = userVentures.map((venture) => venture.id);

    if (ventureIds.length === 0) {
      return new Map<string, { id: string; title: string; estimatedMinutes: number | null }[]>();
    }

    const rows = await this.db.query.tasks.findMany({
      where: and(
        inArray(tasks.ventureId, ventureIds),
        eq(tasks.status, 'backlog'),
        eq(tasks.level, 'micro_task'),
      ),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    const grouped = new Map<string, { id: string; title: string; estimatedMinutes: number | null }[]>();
    for (const row of rows) {
      const list = grouped.get(row.ventureId) ?? [];
      list.push({
        id: row.id,
        title: row.title,
        estimatedMinutes: row.estimatedMinutes,
      });
      grouped.set(row.ventureId, list);
    }

    return grouped;
  }

  private async persistProposal(
    userId: string,
    planDate: string,
    proposal: ProposeDailyTasksInput,
    antiStall: Awaited<ReturnType<AntiStallService['getScoresForUser']>>,
    calendarSlots: { start: string; end: string; durationMinutes: number }[],
    outputMethod: PersistedDailyProposal['outputMethod'],
  ): Promise<PersistedDailyProposal> {
    const ventureNameById = new Map(
      antiStall.scores.map((score) => [score.ventureId, score.ventureName]),
    );

    return this.db.transaction(async (tx) => {
      const existingPlan = await tx.query.dailyPlans.findFirst({
        where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, planDate)),
      });

      let planId: string;
      let status: PersistedDailyProposal['status'];

      if (existingPlan) {
        planId = existingPlan.id;
        status = existingPlan.status as PersistedDailyProposal['status'];
        await tx.delete(dailyPlanTasks).where(eq(dailyPlanTasks.dailyPlanId, planId));
      } else {
        const [created] = await tx
          .insert(dailyPlans)
          .values({ userId, planDate, status: 'proposed' })
          .returning();
        planId = created.id;
        status = created.status as PersistedDailyProposal['status'];
      }

      const proposedTasks: PersistedDailyProposal['proposedTasks'] = [];

      for (let index = 0; index < proposal.tasks.length; index++) {
        const item = proposal.tasks[index];
        const slot = (index + 1) as 1 | 2 | 3;
        const calendarSlot = calendarSlots[index];

        const [task] = await tx
          .insert(tasks)
          .values({
            ventureId: item.ventureId,
            title: item.title,
            level: 'micro_task',
            estimatedMinutes: item.estimatedMinutes,
            status: 'proposed',
            generatedBy: 'ai',
          })
          .returning();

        await tx.insert(dailyPlanTasks).values({
          dailyPlanId: planId,
          taskId: task.id,
          slot,
          rationale: item.rationale,
        });

        proposedTasks.push({
          slot,
          taskId: task.id,
          title: item.title,
          ventureId: item.ventureId,
          ventureName: ventureNameById.get(item.ventureId) ?? 'Unknown venture',
          estimatedMinutes: item.estimatedMinutes,
          rationale: item.rationale,
          proposedStartTime: calendarSlot?.start ?? null,
          proposedEndTime: calendarSlot?.end ?? null,
          calendarEventId: null,
        });
      }

      return {
        planId,
        planDate,
        status,
        outputMethod,
        assistantMessage:
          proposal.assistantMessage ?? "Good morning. Here's what I'm proposing for today:",
        antiStall,
        calendarSlots,
        proposedTasks,
      };
    });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
