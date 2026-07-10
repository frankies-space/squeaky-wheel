import { IsString, MinLength } from 'class-validator';

export class CompleteOAuthDto {
  @IsString()
  @MinLength(1)
  code!: string;
}
