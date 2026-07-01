import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

// Define static permissions for Connect platform
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'manage:users',
    'manage:departments',
    'manage:services',
    'manage:documents',
    'read:analytics',
    'read:audit-logs',
    'configure:ai',
    'approve:applications',
    'reject:applications',
    'read:applications',
    'write:applications',
    'upload:documents',
  ],
  user: [
    'read:departments',
    'read:services',
    'read:applications',
    'write:applications',
    'upload:documents',
    'manage:profile',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
