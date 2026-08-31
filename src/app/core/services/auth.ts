import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private tokenKey = 'cs_token';
  private username = 'username';

  constructor(private http: HttpClient, private router: Router) {}

  login(data: { email: string; password: string }) {
    return this.http.post<any>('/auth/login', data).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem(this.username, res.name);
      })
    );
  }

  register(data: any) {
    return this.http.post('/auth/register', data);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.username);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }
  getUserName(): string {
     return localStorage.getItem(this.username) ?? '';
  }

decode() {

  const token = this.getToken();

  if (!token) return null;

  try {

    return JSON.parse(
      atob(token.split('.')[1])
    );

  } catch (e) {

    console.error('Invalid token');

    this.logout();

    return null;
  }
}

  getRole() {
    return this.decode()?.role;
  }


isLoggedIn(): boolean {

  const token = this.getToken();

  if (!token) return false;

  try {

    const decoded: any = JSON.parse(
      atob(token.split('.')[1])
    );

    const expiry = decoded.exp * 1000;

    return Date.now() < expiry;

  } catch {

    return false;
  }
}

  redirectByRole(): void {
//   const roleRoutes: Record<string, string> = {
//     CITIZEN: '/citizen',
//     OFFICER: '/officer-dashboard',
//     ADMIN:   '/admin-dashboard',
//   };
//   const role = this.getRole() ?? '';
//   const route = roleRoutes[role] ?? '/login';
//   this.router.navigate([route]);
     this.router.navigate(['/']);
  }

 forgotPassword(email: string): Observable<any> {
   return this.http.post('/auth/forgot-password', { email });
 }

 resetPassword(token: string, newPassword: string): Observable<any> {
   return this.http.post('/auth/reset-password', { token, newPassword });
 }

}
