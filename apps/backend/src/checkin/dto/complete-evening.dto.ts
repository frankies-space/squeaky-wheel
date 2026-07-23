import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

const OUTCOMES = ['done', 'not_done', 'partial'] as const;
const DISPOSITIONS = ['tomorrow', 'backlog'] as const;

export class EveningOutcomeDto {
  @IsUUID()
  taskId!: string;

  @IsIn(OUTCOMES)
  outcome!: (typeof OUTCOMES)[number];

  @IsOptional()
  @IsIn(DISPOSITIONS)
  disposition?: (typeof DISPOSITIONS)[number];
}

export class CompleteEveningCheckinDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => EveningOutcomeDto)
  outcomes!: EveningOutcomeDto[];
}
