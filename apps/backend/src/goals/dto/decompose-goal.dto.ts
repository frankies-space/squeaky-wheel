import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecomposeGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalContext?: string;
}
