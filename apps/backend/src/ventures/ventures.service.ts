import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type {
  CreateVentureRequest,
  UpdateVentureRequest,
  VentureResponse,
} from '@squeaky-wheel/shared-types';
import { toVentureResponse } from '../common/mappers';
import { DRIZZLE, type Database } from '../db/database.module';
import { ventures } from '../db/schema';

@Injectable()
export class VenturesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(userId: string): Promise<VentureResponse[]> {
    const rows = await this.db.query.ventures.findMany({
      where: eq(ventures.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return rows.map(toVentureResponse);
  }

  async getById(userId: string, ventureId: string): Promise<VentureResponse> {
    const venture = await this.findOwnedVenture(userId, ventureId);
    return toVentureResponse(venture);
  }

  async create(userId: string, input: CreateVentureRequest): Promise<VentureResponse> {
    const [created] = await this.db
      .insert(ventures)
      .values({
        userId,
        name: input.name,
        description: input.description ?? null,
        priorityWeight:
          input.priorityWeight !== undefined ? String(input.priorityWeight) : undefined,
        status: input.status,
        maxDaysWithoutAttention: input.maxDaysWithoutAttention,
      })
      .returning();

    return toVentureResponse(created);
  }

  async update(
    userId: string,
    ventureId: string,
    input: UpdateVentureRequest,
  ): Promise<VentureResponse> {
    await this.findOwnedVenture(userId, ventureId);

    const updates: Partial<typeof ventures.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.priorityWeight !== undefined) {
      updates.priorityWeight = String(input.priorityWeight);
    }
    if (input.status !== undefined) updates.status = input.status;
    if (input.maxDaysWithoutAttention !== undefined) {
      updates.maxDaysWithoutAttention = input.maxDaysWithoutAttention;
    }

    const [updated] = await this.db
      .update(ventures)
      .set(updates)
      .where(and(eq(ventures.id, ventureId), eq(ventures.userId, userId)))
      .returning();

    return toVentureResponse(updated);
  }

  async remove(userId: string, ventureId: string): Promise<void> {
    await this.ensureOwnedVenture(userId, ventureId);

    await this.db
      .delete(ventures)
      .where(and(eq(ventures.id, ventureId), eq(ventures.userId, userId)));
  }

  async ensureOwnedVenture(userId: string, ventureId: string) {
    const venture = await this.db.query.ventures.findFirst({
      where: and(eq(ventures.id, ventureId), eq(ventures.userId, userId)),
    });

    if (!venture) {
      throw new NotFoundException('Venture not found');
    }

    if (venture.userId !== userId) {
      throw new ForbiddenException('Venture does not belong to this user');
    }

    return venture;
  }

  private async findOwnedVenture(userId: string, ventureId: string) {
    return this.ensureOwnedVenture(userId, ventureId);
  }
}
