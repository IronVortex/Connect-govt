import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true, type: String })
  email!: string;

  @Prop({ required: true, type: String })
  password!: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ default: 'user', type: String })
  role?: string;

  @Prop({ default: Date.now, type: Date })
  createdAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
