import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { GoalStatus } from '@squeaky-wheel/shared-types';

const GOAL_STATUSES: GoalStatus[] = ['active', 'done', 'abandoned'];

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  deadline?: string | null;

  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: GoalStatus;
}
