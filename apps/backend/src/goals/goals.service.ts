import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  CreateGoalRequest,
  GoalResponse,
  UpdateGoalRequest,
} from '@squeaky-wheel/shared-types';
import { toGoalResponse } from '../common/mappers';
import { DRIZZLE, type Database } from '../db/database.module';
import { goals, ventures } from '../db/schema';
import { VenturesService } from '../ventures/ventures.service';

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly venturesService: VenturesService,
  ) {}

  async listByVenture(userId: string, ventureId: string): Promise<GoalResponse[]> {
    await this.venturesService.ensureOwnedVenture(userId, ventureId);

    const rows = await this.db.query.goals.findMany({
      where: eq(goals.ventureId, ventureId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return rows.map(toGoalResponse);
  }

  async create(
    userId: string,
    ventureId: string,
    input: CreateGoalRequest,
  ): Promise<GoalResponse> {
    await this.venturesService.ensureOwnedVenture(userId, ventureId);

    const [created] = await this.db
      .insert(goals)
      .values({
        ventureId,
        title: input.title,
        description: input.description ?? null,
        deadline: input.deadline ?? null,
        status: input.status,
      })
      .returning();

    return toGoalResponse(created);
  }

  async update(userId: string, goalId: string, input: UpdateGoalRequest): Promise<GoalResponse> {
    await this.ensureOwnedGoal(userId, goalId);

    const updates: Partial<typeof goals.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.deadline !== undefined) updates.deadline = input.deadline;
    if (input.status !== undefined) updates.status = input.status;

    const [updated] = await this.db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, goalId))
      .returning();

    return toGoalResponse(updated);
  }

  async remove(userId: string, goalId: string): Promise<void> {
    await this.ensureOwnedGoal(userId, goalId);
    await this.db.delete(goals).where(eq(goals.id, goalId));
  }

  async ensureOwnedGoal(userId: string, goalId: string) {
    const row = await this.db
      .select({ goalId: goals.id })
      .from(goals)
      .innerJoin(ventures, eq(goals.ventureId, ventures.id))
      .where(and(eq(goals.id, goalId), eq(ventures.userId, userId)))
      .limit(1);

    if (row.length === 0) {
      throw new NotFoundException('Goal not found');
    }
  }
}
