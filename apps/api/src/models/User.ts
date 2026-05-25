import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export const USER_ROLES = ['user', 'admin', 'department_officer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    maxlength: 254,
  })
  email!: string;

  @Prop({
    type: String,
    required: true,
    minlength: 8,
    select: false,
  })
  password!: string;

  @Prop({
    type: String,
    select: false,
    required: false,
  })
  refreshTokenHash?: string;

  @Prop({
    type: String,
    trim: true,
    minlength: 2,
    maxlength: 120,
  })
  name?: string;

  @Prop({
    type: String,
    enum: USER_ROLES,
    default: 'user',
    required: true,
    index: true,
  })
  role!: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
