import { ApplicationConfig,importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter,withHashLocation } from '@angular/router';

import { routes } from './app.routes';

import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './core/interceptors/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
     provideRouter(routes, withHashLocation()),
    importProvidersFrom(HttpClientModule),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
};

