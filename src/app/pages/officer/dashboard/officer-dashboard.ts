import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router,RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ComplaintService } from '../../../core/services/complaint.service';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

export interface Complaint {
  id?:                   number;
  title:                 string;
  description:           string;
  priority:              string;
  category:              string;
  status?:               string;
  address:               string;
  latitude?:             number;
  longitude?:            number;
  citizenEmail?:         string;
  citizenName?:          string;
  assignedOfficerEmail?: string;
  resolutionComment?:    string;
  createdAt?:            string;
  updatedAt?:            string;
  resolvedAt?:           string;
  attachmentName?:       string;
  attachmentPath?:       string;
}

// ── Active view type ──────────────────────────────
type ActiveView = 'dashboard' | 'cases';

@Component({
  selector: 'app-officer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './officer-dashboard.html',
  styleUrls: ['./officer-dashboard.scss'],
})
export class OfficerDashboardComponent implements OnInit {

  // ── View state ────────────────────────────────────
  activeView: ActiveView = 'dashboard';

  // ── Data ──────────────────────────────────────────
  complaints: Complaint[] = [];
  loading = true;
  saving  = false;

  // ── Quick update form ─────────────────────────────
  selectedId:    number | null = null;
  updateStatus   = '';
  updateComment  = '';

  selectedComplaint: Complaint | null = null;
  showDetailModal = false;

  fileUrl = '/files';

  // for filter and sort
  casesSearch       = '';
  casesStatusFilter = '';
  casesSort         = 'date-desc';

  statusOptions = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

  sidebarOpen = false;

  constructor(
    public  auth:  AuthService,
    private svc:   ComplaintService,
    private router: Router,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadComplaints();
  }

  // ════════════════════════════════════════════════
  //  NAVIGATION
  // ════════════════════════════════════════════════

  setView(view: ActiveView): void {
    this.activeView = view;
    this.closeSidebar();
    this.loadComplaints();
  }

  logout(): void {
    this.auth.logout();
  }

  // ════════════════════════════════════════════════
  //  DATA
  // ════════════════════════════════════════════════

  loadComplaints(): void {
    this.loading = true;
    this.svc.getAssignedComplaints(0, 100).subscribe({
      next: (res: any) => {
        this.complaints = res.content ?? res;
        this.loading    = false;
        if (this.complaints.length) {
          this.selectedId    = this.complaints[0].id ?? null;
          this.updateStatus  = this.complaints[0].status ?? 'PENDING';
          this.updateComment = this.complaints[0].resolutionComment ?? '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Failed to load assigned cases.');
        this.loading = false;
      },
    });
  }

   viewComplaint(c: Complaint): void {
     this.selectedComplaint = c;
     this.showDetailModal = true;
    }

    closeDetailModal(): void {
     this.showDetailModal = false;
     this.selectedComplaint = null;
    }

  getFileNameFromPath(attachmentPath: string | undefined | null): string {
      if (!attachmentPath) return '';
      return attachmentPath.substring(attachmentPath.lastIndexOf('/') + 1);
    }

  // ════════════════════════════════════════════════
  //  STATS
  // ════════════════════════════════════════════════

  get total()      { return this.complaints.length; }
  get pending()    { return this.countByStatus('PENDING'); }
  get inProgress() { return this.countByStatus('IN_PROGRESS'); }
  get resolved()   { return this.countByStatus('RESOLVED'); }

  get urgentCount(): number {
    return this.complaints.filter(
      c => c.priority?.toUpperCase() === 'HIGH' &&
           c.status?.toUpperCase()   !== 'RESOLVED'
    ).length;
  }

  get recent(): Complaint[] {
    return this.complaints.slice(0, 5);
  }

  countByStatus(status: string): number {
    return this.complaints.filter(
      c => c.status?.toUpperCase() === status.toUpperCase()
    ).length;
  }

  // for filter and sort
  get filteredCases(): Complaint[] {
    let result = [...this.complaints];

    // Search by title
    if (this.casesSearch.trim()) {
      const q = this.casesSearch.toLowerCase();
      result = result.filter(c => c.title?.toLowerCase().includes(q));
    }

    // Filter by status
    if (this.casesStatusFilter) {
      result = result.filter(c =>
        c.status?.toUpperCase() === this.casesStatusFilter
      );
    }

    switch (this.casesSort) {
        case 'date-desc':
          result.sort((a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
          break;
        case 'date-asc':
          result.sort((a, b) =>
            new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
          );
          break;
        case 'priority-high': {
          const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
          result.sort((a, b) =>
            (order[a.priority?.toUpperCase() ?? 'LOW'] ?? 2) -
            (order[b.priority?.toUpperCase() ?? 'LOW'] ?? 2)
          );
          break;
        }
        case 'priority-low': {
          const order: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
          result.sort((a, b) =>
            (order[a.priority?.toUpperCase() ?? 'LOW'] ?? 0) -
            (order[b.priority?.toUpperCase() ?? 'LOW'] ?? 0)
          );
          break;
        }
      }

      return result;
    }

  // ════════════════════════════════════════════════
  //  QUICK UPDATE
  // ════════════════════════════════════════════════

  onSelectComplaint(id: number): void {
    this.selectedId = id;
    const c = this.complaints.find(x => x.id === id);
    if (c) {
      this.updateStatus  = c.status           ?? 'PENDING';
      this.updateComment = c.resolutionComment ?? '';
    }
  }

  saveUpdate(): void {
    if (!this.selectedId) {
      this.toast.error('Please select a complaint.');
      return;
    }
    if (!this.updateStatus) {
      this.toast.error('Please select a status.');
      return;
    }

    this.saving = true;
    const dto = {
      status:            this.updateStatus,
      resolutionComment: this.updateComment,
    };

    this.svc.updateOfficerComplaint(this.selectedId, dto).subscribe({
      next: (updated: any) => {
        const idx = this.complaints.findIndex(c => c.id === this.selectedId);
        if (idx !== -1) this.complaints[idx] = updated;
        this.toast.success('Complaint updated successfully.');
        this.saving = false;
        this.loadComplaints();
      },
      error: () => {
        this.toast.error('Failed to update complaint.');
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════

 get username(): string {
    return this.auth.getUserName();
  }

  getInitials(): string {
    return this.username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getPriorityClass(priority: string | undefined): string {
    switch (priority?.toUpperCase()) {
      case 'HIGH':   return 'od-badge--high';
      case 'MEDIUM': return 'od-badge--medium';
      case 'LOW':    return 'od-badge--low';
      default:       return 'od-badge--low';
    }
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':     return 'od-badge--pending';
      case 'IN_PROGRESS': return 'od-badge--progress';
      case 'RESOLVED':    return 'od-badge--resolved';
      case 'REJECTED':    return 'od-badge--rejected';
      default:            return 'od-badge--pending';
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

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  onImgError(event: Event): void {
        const img = event.target as HTMLImageElement;
        // Hide the img and show placeholder icon instead
        img.style.display = 'none';
        const parent = img.parentElement;
        if (parent) {
          parent.classList.add('ad-complaint-card-img--placeholder');
          parent.innerHTML = '<i class="bi bi-file-earmark-text"></i>';
        }
      }
    isImage(name: string): boolean {
        return /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
      }

    toggleSidebar(): void {
      this.sidebarOpen = !this.sidebarOpen;
    }

    closeSidebar(): void {
      this.sidebarOpen = false;
    }
}
