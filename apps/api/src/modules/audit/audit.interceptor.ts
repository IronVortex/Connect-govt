import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

export interface AuditMetadata {
  action: string;
  module: string;
}

export const AUDIT_KEY = 'audit';
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_KEY, metadata);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditMetadata>(AUDIT_KEY, context.getHandler());
    if (!metadata) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const ipAddress =
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress ||
      'unknown';
    const user = request.user;
    const requestId = request.headers['x-request-id'];

    const getLogPayload = (status: 'SUCCESS' | 'FAILURE', metadataObj?: any) => ({
      user: user?.id,
      role: user?.role,
      action: metadata.action,
      module: metadata.module,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      status,
      requestId,
      metadata: {
        method: request.method,
        url: request.url,
        params: request.params,
        ...metadataObj,
      },
    });

    return next.handle().pipe(
      tap((data) => {
        // Log Success
        let loggedMeta = {};
        if (metadata.action === 'LOGIN' || metadata.action === 'REGISTRATION') {
          // Avoid logging password but log user email
          loggedMeta = { email: request.body?.email };
        } else if (metadata.action === 'UPLOAD_DOCUMENT') {
          loggedMeta = { filename: data?.filename, docId: data?.id };
        } else if (metadata.action === 'SUBMIT_APPLICATION') {
          loggedMeta = { appId: data?.appId, serviceId: data?.service };
        }
        
        // If the route is LOGIN or REGISTER and we just logged in, req.user won't be set yet,
        // but data has the user payload!
        const finalUser = user?.id || data?.user?.id || data?.user?._id || data?._id;
        const finalRole = user?.role || data?.user?.role || data?.role;

        this.auditService.log({
          ...getLogPayload('SUCCESS', loggedMeta),
          user: finalUser,
          role: finalRole,
        }).catch(() => {});
      }),
      catchError((error) => {
        // Log Failure
        const finalUser = user?.id;
        const finalRole = user?.role;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        this.auditService.log({
          ...getLogPayload('FAILURE', { error: errorMsg, bodyEmail: request.body?.email }),
          user: finalUser,
          role: finalRole,
        }).catch(() => {});

        return throwError(() => error);
      }),
    );
  }
}
