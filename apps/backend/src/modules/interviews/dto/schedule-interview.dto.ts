import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InterviewType } from '../schemas/interview.schema';

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ description: 'Scheduled date and time' })
  @IsDate()
  @Type(() => Date)
  scheduledDate: Date;

  @ApiProperty({ description: 'Duration in minutes', minimum: 15 })
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({ enum: InterviewType, description: 'Interview type' })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiPropertyOptional({ description: 'Location for in-person interviews' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Meeting link for video interviews' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
