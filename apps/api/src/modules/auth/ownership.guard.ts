import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface OwnershipMetadata {
  modelName: string;
  paramName: string;
  userField?: string;
}

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (metadata: OwnershipMetadata) => SetMetadata(OWNERSHIP_KEY, metadata);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectConnection() private connection: Connection,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<OwnershipMetadata>(OWNERSHIP_KEY, context.getHandler());
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Admins bypass ownership checks
    if (user.role === 'admin') {
      return true;
    }

    const resourceId = request.params[metadata.paramName];
    if (!resourceId) {
      return true;
    }

    const model = this.connection.model(metadata.modelName);
    if (!model) {
      return true;
    }

    const resource = await model.findById(resourceId).exec();
    if (!resource) {
      return true; // Let controller handle 404
    }

    const userField = metadata.userField || 'user';
    const ownerId = resource[userField];

    if (!ownerId) {
      return true;
    }

    const isOwner = ownerId.toString() === user.id.toString();
    if (!isOwner) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
