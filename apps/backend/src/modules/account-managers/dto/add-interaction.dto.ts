import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddInteractionDto {
  @IsEnum(['call', 'email', 'meeting', 'chat', 'note'])
  type: 'call' | 'email' | 'meeting' | 'chat' | 'note';

  @IsString()
  summary: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number; // in minutes

  @IsString()
  outcome: string;
}
