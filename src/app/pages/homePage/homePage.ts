import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ComplaintService } from '../../core/services/complaint.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './homePage.html',
  styleUrl: './homePage.scss',
})
export class HomeComponent implements OnInit {

  isLoggedIn   = false;
  username     = '';
  role         = '';
  initials     = '';
  dashboardLink = '/login';

  loadingComplaints = false;
  recentComplaints: any[] = [];

  dropdownOpen = false;

  stats = {
    totalResolved:   0,
    activeOfficers:  0,
    totalCitizens:   0,
    totalComplaints: 0,
  };
  loadingStats = false;

  constructor(
    private auth: AuthService,
    private complaintService: ComplaintService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    if (this.isLoggedIn) {
      this.username  = this.auth.getUserName();
      this.role      = this.auth.getRole() ?? '';
      this.initials  = this.getInitials(this.username);
      this.dashboardLink = this.getDashboardLink();
      this.loadRecentComplaints();
    }
    this.loadStats();  // ← always load, public endpoint
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

  // ── Helpers ───────────────────────────────────
  private getDashboardLink(): string {
    const map: Record<string, string> = {
      CITIZEN: '/citizen',
      OFFICER: '/officer-dashboard',
      ADMIN:   '/admin-dashboard',
    };
    return map[this.role] ?? '/login';
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get roleBadgeClass(): string {
    const map: Record<string, string> = {
      CITIZEN: 'cs-role-badge--blue',
      OFFICER: 'cs-role-badge--amber',
      ADMIN:   'cs-role-badge--purple',
    };
    return map[this.role] ?? '';
  }

  get roleIcon(): string {
    const map: Record<string, string> = {
      CITIZEN: 'bi-people-fill',
      OFFICER: 'bi-shield-check',
      ADMIN:   'bi-gear-fill',
    };
    return map[this.role] ?? 'bi-person';
  }

   // Helper to format large numbers
  formatStat(val: number): string {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k+';
    return val.toString();
  }


  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.cs-home-nav-user')) {
      this.dropdownOpen = false;
      this.cdr.detectChanges();
    }
  }

  // ── Load recent complaints ─────────────────────
  loadRecentComplaints(): void {
    this.loadingComplaints = true;

    // Use the right service method per role
    const call$ = this.role === 'CITIZEN'
      ? this.complaintService.getMyComplaints(0, 3)
      : this.role === 'OFFICER'
        ? this.complaintService.getAssignedComplaints(0, 3)
        : this.complaintService.getAllComplaints(0, 3);

    call$.subscribe({
      next: (data: any) => {
        this.recentComplaints = (data.content ?? data).slice(0, 3);
        this.loadingComplaints = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingComplaints = false;
        this.cdr.detectChanges();
      },
    });
  }

  logout(): void {
   this.auth.logout();
   this.isLoggedIn   = false;
   this.username     = '';
   this.role         = '';
   this.recentComplaints = [];
   this.dropdownOpen = false;
   this.cdr.detectChanges();
  }

  // ── Status / Priority helpers ──────────────────
  getStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':     return 'cs-status--pending';
      case 'IN_PROGRESS': return 'cs-status--progress';
      case 'RESOLVED':    return 'cs-status--resolved';
      case 'REJECTED':    return 'cs-status--rejected';
      default:            return 'cs-status--pending';
    }
  }

  formatStatus(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':     return 'Pending';
      case 'IN_PROGRESS': return 'In Progress';
      case 'RESOLVED':    return 'Resolved';
      case 'REJECTED':    return 'Rejected';
      default:            return status ?? '—';
    }
  }

  getPriorityClass(priority: string | undefined): string {
    switch (priority?.toUpperCase()) {
      case 'HIGH':   return 'cs-priority--high';
      case 'MEDIUM': return 'cs-priority--medium';
      case 'LOW':    return 'cs-priority--low';
      default:       return 'cs-priority--low';
    }
  }
}
