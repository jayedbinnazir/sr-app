import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type StandardResponse<T> = {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
  data: T;
};

const METHOD_MESSAGES: Record<string, string> = {
  GET: 'Fetched successfully',
  POST: 'Created successfully',
  PUT: 'Updated successfully',
  PATCH: 'Updated successfully',
  DELETE: 'Deleted successfully',
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();
    const request = httpContext.getRequest();

    return next.handle().pipe(
      map((data: T) => {
        if (this.shouldBypassWrapping(data)) {
          return data as unknown as StandardResponse<T>;
        }

        const statusCode = response?.statusCode ?? 200;
        const path = request?.originalUrl ?? request?.url ?? '';
        const method = request?.method ?? 'GET';
        const message =
          response?.statusMessage && response.statusMessage.trim().length > 0
            ? response.statusMessage
            : METHOD_MESSAGES[method] ?? 'Success';

        return {
          statusCode,
          message,
          path,
          timestamp: new Date().toISOString(),
          data: data ?? (null as Primitive as T),
        };
      }),
    );
  }

  private shouldBypassWrapping(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string' || typeof value === 'boolean') {
      return false;
    }

    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'symbol') {
      return false;
    }

    if (typeof value === 'object') {
      if (
        'statusCode' in (value as Record<string, unknown>) &&
        'message' in (value as Record<string, unknown>) &&
        'data' in (value as Record<string, unknown>)
      ) {
        return true;
      }

      if (typeof (value as any).pipe === 'function') {
        return true;
      }
    }

    return false;
  }
}

