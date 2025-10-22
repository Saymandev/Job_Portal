import { IsArray, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class AssignClientDto {
  @IsString()
  clientId: string;

  @IsString()
  accountManagerId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsObject()
  preferences?: {
    communicationMethod: 'email' | 'phone' | 'video' | 'chat';
    preferredTime: string;
    timezone: string;
    language: string;
  };
}
