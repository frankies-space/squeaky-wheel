import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { UpdateUserRequest, UserResponse } from '@squeaky-wheel/shared-types';
import { toUserResponse } from '../common/mappers';
import { DRIZZLE, type Database } from '../db/database.module';
import { users } from '../db/schema';
import type { AuthUser } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async ensureUser(authUser: AuthUser): Promise<UserResponse> {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (existing) {
      return toUserResponse(existing);
    }

    const [created] = await this.db
      .insert(users)
      .values({
        id: authUser.id,
        email: authUser.email,
      })
      .returning();

    return toUserResponse(created);
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserResponse(user);
  }

  async updateMe(userId: string, input: UpdateUserRequest): Promise<UserResponse> {
    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.displayName !== undefined) updates.displayName = input.displayName;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.checkinTime !== undefined) updates.checkinTime = input.checkinTime;

    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return toUserResponse(updated);
  }
}
