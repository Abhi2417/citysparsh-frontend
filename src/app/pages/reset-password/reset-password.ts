import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
})
export class ResetPasswordComponent implements OnInit {
  token        = '';
  newPassword  = '';
  confirmPassword = '';
  showPassword = false;
  loading      = false;
  success      = false;
  error        = '';
  submitted    = false;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private auth:   AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error = 'Invalid or missing reset token.';
    }
  }

  get passwordMismatch(): boolean {
    return this.submitted && this.newPassword !== this.confirmPassword;
  }

  submit(): void {
    this.submitted = true;
    this.error     = '';

    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: any) => {
        this.loading = false;
        this.error   = err?.error?.error ?? 'Invalid or expired link. Please request a new one.';
      }
    });
  }
}
