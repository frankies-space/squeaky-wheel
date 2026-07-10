import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { generateText, tool } from 'ai';
import type { DecomposeGoalResponse } from '@squeaky-wheel/shared-types';
import { toTaskResponse } from '../common/mappers';
import { DRIZZLE, type Database } from '../db/database.module';
import { goals, tasks, ventures } from '../db/schema';
import { flattenTaskTree, validateTaskTree } from '../tasks/persist-task-tree';
import { buildMockTaskTree } from './mock-decomposition';
import { LlmProviderService } from './provider';
import { buildDecompositionContext, SYSTEM_PROMPT } from './system-prompt';
import {
  CREATE_TASK_TREE_TOOL_DESCRIPTION,
  createTaskTreeInputSchema,
  type CreateTaskTreeInput,
} from './tools/create-task-tree';

export interface DecomposeGoalInput {
  userId: string;
  goalId: string;
  additionalContext?: string;
}

@Injectable()
export class DecompositionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly llmProvider: LlmProviderService,
  ) {}

  async decomposeGoal(input: DecomposeGoalInput): Promise<DecomposeGoalResponse> {
    const context = await this.loadGoalContext(input.userId, input.goalId);

    if (context.goal.status !== 'active') {
      throw new BadRequestException('Only active goals can be decomposed');
    }

    const mode = this.llmProvider.getMode();
    const treeInput =
      mode === 'mock'
        ? buildMockTaskTree(context.goal.title)
        : await this.generateTaskTreeWithLlm(context, input.additionalContext);

    validateTaskTree(treeInput.root);

    const persisted = await this.persistTaskTree(
      context.goal.ventureId,
      context.goal.id,
      treeInput,
    );

    return {
      goalId: context.goal.id,
      ventureId: context.goal.ventureId,
      outputMethod: mode === 'mock' ? 'mock' : 'tool_call',
      assistantMessage:
        mode === 'mock'
          ? `Decomposed "${context.goal.title}" into ${persisted.length} tasks (mock provider).`
          : null,
      tasks: persisted.map(toTaskResponse),
    };
  }

  private async loadGoalContext(userId: string, goalId: string) {
    const row = await this.db
      .select({
        goal: goals,
        venture: ventures,
      })
      .from(goals)
      .innerJoin(ventures, eq(goals.ventureId, ventures.id))
      .where(and(eq(goals.id, goalId), eq(ventures.userId, userId)))
      .limit(1);

    if (row.length === 0) {
      throw new NotFoundException('Goal not found');
    }

    return row[0];
  }

  private async generateTaskTreeWithLlm(
    context: {
      goal: typeof goals.$inferSelect;
      venture: typeof ventures.$inferSelect;
    },
    additionalContext?: string,
  ): Promise<CreateTaskTreeInput> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER is not mock',
      );
    }

    const contextBlock = buildDecompositionContext({
      ventureName: context.venture.name,
      ventureDescription: context.venture.description,
      goalTitle: context.goal.title,
      goalDescription: context.goal.description,
      goalDeadline: context.goal.deadline,
      additionalContext,
    });

    const result = await generateText({
      model: this.llmProvider.getModel(),
      system: `${SYSTEM_PROMPT}\n\n${contextBlock}`,
      prompt:
        'Decompose the goal above into a task tree. Return ONLY via the create_task_tree tool — no task list in prose.',
      tools: {
        create_task_tree: tool({
          description: CREATE_TASK_TREE_TOOL_DESCRIPTION,
          inputSchema: createTaskTreeInputSchema,
        }),
      },
      toolChoice: { type: 'tool', toolName: 'create_task_tree' },
    });

    const toolCall = result.toolCalls.find((call) => call.toolName === 'create_task_tree');
    if (!toolCall) {
      throw new ServiceUnavailableException(
        'Model did not return a create_task_tree tool call',
      );
    }

    return createTaskTreeInputSchema.parse(toolCall.input);
  }

  private async persistTaskTree(
    ventureId: string,
    goalId: string,
    treeInput: CreateTaskTreeInput,
  ) {
    const flat = flattenTaskTree(treeInput.root);
    const insertedIds: string[] = [];

    return this.db.transaction(async (tx) => {
      const created: (typeof tasks.$inferSelect)[] = [];

      for (const row of flat) {
        const parentTaskId =
          row.parentIndex === null ? null : (insertedIds[row.parentIndex] ?? null);

        const [task] = await tx
          .insert(tasks)
          .values({
            ventureId,
            goalId,
            parentTaskId,
            title: row.title,
            description: row.description,
            level: row.level,
            estimatedMinutes: row.estimatedMinutes,
            status: 'backlog',
            generatedBy: 'ai',
          })
          .returning();

        insertedIds.push(task.id);
        created.push(task);
      }

      return created;
    });
  }
}
