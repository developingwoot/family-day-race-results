import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const check = () => {
    if (authService.isAuthenticated()) return true;
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  };

  if (authService.authInitialized()) {
    return check();
  }

  // Firebase Auth is async on fresh page load — wait for it to resolve before deciding
  return toObservable(authService.authInitialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => check())
  );
};
