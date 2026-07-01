import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    
    // Bypass transformation for files/streams (download file endpoint)
    if (request.url.includes('/upload/files/')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data already has success structure, return it directly
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }
        
        let message = 'Operation successful';
        if (data && typeof data === 'object' && 'message' in data) {
          message = data.message;
          delete data.message;
        }

        return {
          success: true,
          message,
          data: data ?? null,
        };
      }),
    );
  }
}
