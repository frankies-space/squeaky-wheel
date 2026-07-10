import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AntiStallScoresResponse } from '@squeaky-wheel/shared-types';
import { DRIZZLE, type Database } from '../db/database.module';
import { ventureAttentionLog, ventures } from '../db/schema';
import {
  DEFAULT_ATTENTION_WINDOW_DAYS,
  rankVenturesByUrgency,
  scoreVenture,
} from './scoring';

@Injectable()
export class AntiStallService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getScoresForUser(
    userId: string,
    referenceDate = formatDate(new Date()),
  ): Promise<AntiStallScoresResponse> {
    const userVentures = await this.db.query.ventures.findMany({
      where: eq(ventures.userId, userId),
      orderBy: (table, { asc }) => [asc(table.name)],
    });

    if (userVentures.length === 0) {
      return {
        referenceDate,
        attentionWindowDays: DEFAULT_ATTENTION_WINDOW_DAYS,
        scores: [],
      };
    }

    const ventureIds = userVentures.map((v) => v.id);
    const windowStart = subtractDays(referenceDate, DEFAULT_ATTENTION_WINDOW_DAYS - 1);

    const attentionRows = await this.db
      .select({
        ventureId: ventureAttentionLog.ventureId,
        lastAttendedAt: sql<string | null>`max(${ventureAttentionLog.attendedAt})`,
        attentionCount7d: sql<number>`count(*) filter (where ${ventureAttentionLog.attendedAt} >= ${windowStart})`,
      })
      .from(ventureAttentionLog)
      .where(inArray(ventureAttentionLog.ventureId, ventureIds))
      .groupBy(ventureAttentionLog.ventureId);

    const attentionByVenture = new Map(
      attentionRows.map((row) => [
        row.ventureId,
        {
          lastAttendedAt: row.lastAttendedAt,
          attentionCount7d: Number(row.attentionCount7d),
        },
      ]),
    );

    const scored = userVentures.map((venture) => {
      const attention = attentionByVenture.get(venture.id);
      const result = scoreVenture({
        ventureId: venture.id,
        ventureName: venture.name,
        status: venture.status as 'active' | 'paused' | 'archived',
        priorityWeight: Number(venture.priorityWeight),
        maxDaysWithoutAttention: venture.maxDaysWithoutAttention,
        lastAttendedAt: attention?.lastAttendedAt ?? null,
        attentionCount7d: attention?.attentionCount7d ?? 0,
        referenceDate,
      });

      return {
        ventureId: result.ventureId,
        ventureName: result.ventureName,
        status: result.status,
        priorityWeight: result.priorityWeight,
        maxDaysWithoutAttention: result.maxDaysWithoutAttention,
        daysSinceLastAttention: result.daysSinceLastAttention,
        attentionCount7d: result.attentionCount7d,
        urgencyScore: result.urgencyScore,
        isEligible: result.isEligible,
        isOverdue: result.isOverdue,
      };
    });

    return {
      referenceDate,
      attentionWindowDays: DEFAULT_ATTENTION_WINDOW_DAYS,
      scores: rankVenturesByUrgency(scored).map((s) => ({
        ventureId: s.ventureId,
        ventureName: s.ventureName,
        status: s.status,
        priorityWeight: s.priorityWeight,
        maxDaysWithoutAttention: s.maxDaysWithoutAttention,
        daysSinceLastAttention: s.daysSinceLastAttention,
        attentionCount7d: s.attentionCount7d,
        urgencyScore: s.urgencyScore,
        isEligible: s.isEligible,
        isOverdue: s.isOverdue,
      })),
    };
  }

  async recordAttention(
    userId: string,
    ventureId: string,
    dailyPlanId: string,
    attendedAt: string,
  ): Promise<void> {
    const venture = await this.db.query.ventures.findFirst({
      where: and(eq(ventures.id, ventureId), eq(ventures.userId, userId)),
    });

    if (!venture) {
      throw new NotFoundException('Venture not found');
    }

    await this.db.insert(ventureAttentionLog).values({
      ventureId,
      dailyPlanId,
      attendedAt,
    });
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
