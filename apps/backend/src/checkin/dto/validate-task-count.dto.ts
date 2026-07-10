import { IsInt, Max, Min } from 'class-validator';

export class ValidateTaskCountDto {
  @IsInt()
  @Min(0)
  @Max(10)
  taskCount!: number;
}
