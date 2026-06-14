import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '@core/services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Background polling must never trigger the global loading overlay
  if (req.url.includes('/notifications/unread/count')) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
