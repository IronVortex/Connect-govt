import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../models/User';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec() as any;
  }

  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateProfile(
    userId: string,
    name: string,
    email: string,
    profileImage?: string,
    gender?: string,
    dob?: string,
    nationality?: string,
    address?: string,
  ): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (email !== user.email) {
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email is already taken');
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    if (gender !== undefined) {
      user.gender = gender;
    }

    if (dob !== undefined) {
      user.dob = dob;
    }

    if (nationality !== undefined) {
      user.nationality = nationality;
    }

    if (address !== undefined) {
      user.address = address;
    }

    await user.save();
    return user;
  }

  async updatePassword(
    userId: string,
    currentPassword?: string,
    newPassword?: string,
  ): Promise<void> {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Incorrect current password');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // We could soft-delete or hard-delete here. For now, hard delete.
    await this.userModel.findByIdAndDelete(userId).exec();
  }
}