import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in response format, return as-is
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }

        let responseMessage = 'Request completed successfully';
        let meta: any = null;
        let responseData = data;

        if (data && typeof data === 'object') {
          if ('data' in data) {
            responseData = data.data;
            meta = data.meta || null;
            responseMessage = data.message || responseMessage;
          } else if ('message' in data && Object.keys(data).length === 1) {
            responseMessage = data.message;
            responseData = null;
          }
        }

        return {
          success: true,
          message: responseMessage,
          data: responseData !== undefined ? responseData : null,
          meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
