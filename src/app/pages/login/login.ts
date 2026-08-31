import { Component,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { ComplaintService } from '../../core/services/complaint.service';

type ActiveRole = 'CITIZEN' | 'OFFICER' | 'ADMIN';

interface RoleTab {
  key: ActiveRole;
  label: string;
  icon: string; // Bootstrap Icon class
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  email        = '';
  password     = '';
  rememberMe   = false;
  showPassword = false;
  loading      = false;
  submitted    = false;
  activeRole: ActiveRole = 'CITIZEN';

  roles: RoleTab[] = [
    { key: 'CITIZEN', label: 'Citizen', icon: 'bi-people'       },
    { key: 'OFFICER', label: 'Officer', icon: 'bi-shield-check' },
    { key: 'ADMIN',   label: 'Admin',   icon: 'bi-gear-fill'    },
  ];

    // ── Forgot password state ─────────────────────
    showForgotModal  = false;
    forgotEmail      = '';
    forgotSubmitted  = false;
    forgotLoading    = false;
    forgotSuccess    = false;


    stats = {
        totalResolved:   0,
        activeOfficers:  0,
        totalCitizens:   0,
        totalComplaints: 0,
      };
      loadingStats = false;


  constructor(private auth: AuthService, private toast: ToastService,private complaintService: ComplaintService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStats();  // ← always load, public endpoint
  }

  setRole(role: ActiveRole): void {
    this.activeRole = role;
  }

  get emailInvalid(): boolean {
    return this.submitted && (!this.email || !this.email.includes('@'));
  }

  get passwordInvalid(): boolean {
    return this.submitted && !this.password;
  }

  onSubmit(): void {
    this.submitted = true;

    if (!this.email || !this.email.includes('@')) {
      this.toast.error('Please enter a valid email address.');
      return;
    }
    if (!this.password) {
      this.toast.error('Please enter your password.');
      return;
    }

    this.loading = true;

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        if (res.role !== this.activeRole) {
          this.toast.warning(
            `Signed in as ${res.role.toLowerCase()}. Redirecting to your dashboard.`
          );
        } else {
          this.toast.success('Welcome back!');
        }
        this.auth.redirectByRole();
      },
      error: () => {
        this.toast.error('Invalid email or password. Please try again.');
        this.loading = false;
      },
    });
  }

  openForgotModal(): void {
    this.showForgotModal = true;
    this.forgotEmail     = this.email; // pre-fill if already typed
    this.forgotSubmitted = false;
    this.forgotSuccess   = false;
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
    this.forgotEmail     = '';
    this.forgotSubmitted = false;
    this.forgotSuccess   = false;
    this.forgotLoading   = false;
  }

  submitForgotPassword(): void {
    this.forgotSubmitted = true;
    if (!this.forgotEmail || !this.forgotEmail.includes('@')) {
      this.toast.error('Please enter a valid email address.');
      return;
    }

    this.forgotLoading = true;
    this.auth.forgotPassword(this.forgotEmail).subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotSuccess = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.forgotLoading = false;
        this.forgotSuccess = true; // show success anyway — don't reveal if email exists
         this.cdr.detectChanges();
      }
    });
  }

    // Helper to format large numbers
  formatStat(val: number): string {
      if (val >= 1000) return (val / 1000).toFixed(1) + 'k+';
      return val.toString();
  }
  loadStats(): void {
      this.loadingStats = true;
      this.complaintService.getPublicStats().subscribe({
        next: (data: any) => {
          this.stats = data;
          this.loadingStats = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingStats = false; // silently fail, keep zeros
        }
      });
    }
}
