import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class RegisterComponent {
  firstName    = '';
  lastName     = '';
  email        = '';
  password     = '';
  showPassword = false;
  loading      = false;
  submitted    = false;

  constructor(
    private auth:   AuthService,
    private toast:  ToastService,
    private router: Router,
  ) {}

  get fullName(): string {
    return `${this.firstName.trim()} ${this.lastName.trim()}`.trim();
  }

  get passwordStrength(): 0 | 1 | 2 | 3 | 4 {
    const p = this.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[0-9]/.test(p))         score++;
    if (/[^A-Za-z0-9]/.test(p))  score++;
    return score as 0 | 1 | 2 | 3 | 4;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength];
  }

  get strengthColor(): string {
    return ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][this.passwordStrength];
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.firstName.trim() || !this.lastName.trim()) {
      this.toast.error('Please enter your first and last name.');
      return;
    }
    if (!this.email.includes('@')) {
      this.toast.error('Please enter a valid email address.');
      return;
    }
    if (this.password.length < 6) {
      this.toast.error('Password must be at least 6 characters.');
      return;
    }
    this.loading = true;
   this.auth
     .register({
       firstName: this.firstName,
       lastName: this.lastName,
       email: this.email,
       password: this.password,
     })
     .subscribe({
       next: () => {
         this.toast.success('Account created! Please sign in.');
         this.router.navigate(['/login']);
       },
       error: (err) => {
         this.toast.error(err?.error?.message || 'Registration failed. Try again.');
         this.loading = false;
       },
     });
  }
}

