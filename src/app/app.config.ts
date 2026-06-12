import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { APP_ROUTES } from './app.routes';
import { jwtInterceptor } from '@core/interceptors/jwt.interceptor';
import { loadingInterceptor } from '@core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([loadingInterceptor, jwtInterceptor])),
  ],
};
