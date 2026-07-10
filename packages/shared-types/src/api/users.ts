import type { User } from '../db';

export interface UserResponse extends User {}

export interface UpdateUserRequest {
  displayName?: string | null;
  timezone?: string;
  checkinTime?: string;
}
