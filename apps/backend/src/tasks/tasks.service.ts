import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { TaskResponse } from '@squeaky-wheel/shared-types';
import { toTaskResponse } from '../common/mappers';
import { DRIZZLE, type Database } from '../db/database.module';
import { goals, tasks, ventures } from '../db/schema';

@Injectable()
export class TasksService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listByGoal(userId: string, goalId: string): Promise<TaskResponse[]> {
    await this.ensureOwnedGoal(userId, goalId);

    const rows = await this.db.query.tasks.findMany({
      where: eq(tasks.goalId, goalId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    return rows.map(toTaskResponse);
  }

  private async ensureOwnedGoal(userId: string, goalId: string) {
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
