import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingsDocument = PlatformSettings & Document;

@Schema({ timestamps: true })
export class PlatformSettings {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop({ default: 'system' })
  category: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
