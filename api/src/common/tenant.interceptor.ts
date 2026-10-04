import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithTenant, TenantStore } from './tenant-context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request.company) {
      return next.handle();
    }

    const userId = request.user?.id || request.user?._id;
    const store: TenantStore = {
      userId: userId ? userId.toString() : '',
      companyId: request.company._id,
      companySlug: request.company.slug,
      membership: request.membership,
    };

    return new Observable((subscriber) => {
      return runWithTenant(store, () => {
        const subscription = next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => subscription.unsubscribe();
      });
    });
  }
}
