import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { CalendarConnectionStatus } from '@squeaky-wheel/shared-types';
import { DRIZZLE, type Database } from '../db/database.module';
import { calendarConnections } from '../db/schema';

@Injectable()
export class CalendarConnectionService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getStatus(userId: string): Promise<CalendarConnectionStatus> {
    const connection = await this.db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    if (!connection) {
      return { connected: false, provider: null, externalCalendarId: null };
    }

    return {
      connected: true,
      provider: connection.provider as CalendarConnectionStatus['provider'],
      externalCalendarId: connection.externalCalendarId,
    };
  }

  async upsertGoogleConnection(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
      externalCalendarId?: string;
    },
  ) {
    const existing = await this.db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, userId),
    });

    if (existing) {
      const [updated] = await this.db
        .update(calendarConnections)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          externalCalendarId: tokens.externalCalendarId ?? existing.externalCalendarId,
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(calendarConnections)
      .values({
        userId,
        provider: 'google',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        externalCalendarId: tokens.externalCalendarId ?? 'primary',
      })
      .returning();

    return created;
  }

  async getConnectionForUser(userId: string) {
    return this.db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }
}
