import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/authService';
import { map, tap } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Use asynchronous check to support page refreshes and secure direct links
  return authService.checkSession().pipe(
    tap((isLoggedIn) => {
      if (!isLoggedIn) {
        console.warn('[AuthGuard] Unauthorized access blocked. Redirecting to home...');
        router.navigate(['/']);
      }
    }),
    map((isLoggedIn) => isLoggedIn)
  );
};
