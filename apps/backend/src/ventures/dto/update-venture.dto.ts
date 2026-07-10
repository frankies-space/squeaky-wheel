import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { VentureStatus } from '@squeaky-wheel/shared-types';

const VENTURE_STATUSES: VentureStatus[] = ['active', 'paused', 'archived'];

export class UpdateVentureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9.99)
  priorityWeight?: number;

  @IsOptional()
  @IsIn(VENTURE_STATUSES)
  status?: VentureStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  maxDaysWithoutAttention?: number;
}
