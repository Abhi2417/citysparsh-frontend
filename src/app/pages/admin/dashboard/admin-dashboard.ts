import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  address:               string;
  latitude?:             number;
  longitude?:            number;
  wardName?:             string;
  zone?:                 string;
  status?:               string;
  citizenEmail?:         string;
  citizenName?:          string;
  assignedOfficerEmail?: string;
  assignedOfficerName?:  string;
  resolutionComment?:    string;
  createdAt?:            string;
  updatedAt?:            string;
  resolvedAt?:           string;
  attachmentName?:       string;
  attachmentPath?:       string;
}

type ActiveView = 'dashboard' | 'complaints' | 'create-officer' | 'citizens' | 'officers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboardComponent implements OnInit {

  // ── View state ────────────────────────────────────
  activeView: ActiveView = 'dashboard';

  // ── Data ──────────────────────────────────────────
  complaints: Complaint[] = [];
  loading  = true;
  savingAssign  = false;  // for assign officer
  savingUpdate  = false;  // for update status
  creating = false;

  // ── Filter / Sort (All Complaints view) ───────────
  filterStatus   = '';   // '' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  filterCategory = '';
  searchText     = '';
  sortBy         = 'date-desc'; // date-desc | date-asc | priority-high | priority-low

  categoryOptions = [
    'ROADS_AND_POTHOLES',
    'WATER_AND_DRAINAGE',
    'STREET_LIGHTING',
    'WASTE_MANAGEMENT',
    'PARKS_AND_GREENERY',
    'PUBLIC_BUILDINGS',
    'GENERAL',
  ];

  // ── Assign officer form ───────────────────────────
  assignComplaintId: number | null = null;
  assignOfficerId: number | null = null;
  assignStatus      = '';

  // ── Create officer form ───────────────────────────
  newOfficerFirstName = '';
  newOfficerLastName = '';
  newOfficerEmail    = '';
  newOfficerDepartment = '';
  newOfficerPassword = '';
  showNewPassword    = false;

  // ── Update status form ────────────────────────────
  updateComplaintId: number | null = null;
  updateStatus      = '';
  updateComment     = '';

  // All citizen and officer details
  citizens: any[] = [];
  officers: any[] = [];
  loadingUsers = false;

  selectedComplaint: Complaint | null = null;
  showDetailModal = false;

  fileUrl = '/files';

  statusOptions = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

  citizenSearch = '';
  officerSearch = '';

  departmentOptions = [
    'ROADS_AND_TRANSPORTATION',
    'ELECTRICAL_SERVICES',
    'WATER_SUPPLY_AND_DRAINAGE',
    'SANITATION_AND_WASTE_MANAGEMENT',
    'PARKS_AND_HORTICULTURE',
    'BUILDINGS_AND_MAINTENANCE',
    'GENERAL',
  ];

  eligibleOfficers: any[] = [];   // officers filtered by complaint category
  loadingOfficers  = false;
  selectedComplaintCategory = '';

  sidebarOpen = false;

  allWards:         any[] = [];
  wardsInZone:      any[] = [];
  newOfficerWardId: number | null = null;
  newOfficerZone    = '';

  showAssignModal    = false;
  showManageModal    = false;
  assigningComplaint: Complaint | null = null;
  managingComplaint: Complaint | null = null;

  // filter officer table
  officerDeptFilter  = '';
  officerZoneFilter  = '';
  officerWardFilter  = '';
  wardsForOfficerFilter: any[] = [];

  // complaint table zone+ward filter
  filterZone               = '';
  filterWard               = '';
  wardsForComplaintFilter: any[] = [];

  bangaloreZones = [
    'Yelahanka', 'Dasarahalli', 'RR Nagar', 'West',
    'East', 'Mahadevapura', 'South', 'Bommanahalli'
  ];

  constructor(
    public  auth:  AuthService,
    private svc:   ComplaintService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadComplaints();
    this.loadOfficers();
    this.loadCitizens();
    this.loadWards();
  }

  // ════════════════════════════════════════════════
  //  NAVIGATION
  // ════════════════════════════════════════════════

  setView(view: ActiveView): void {
    this.activeView = view;
    this.closeSidebar();
    if (view === 'dashboard') this.loadComplaints();
    if (view === 'complaints') this.loadComplaints();
    if (view === 'citizens') this.loadCitizens();
    if (view === 'officers') this.loadOfficers();
  }

  logout(): void {
    this.auth.logout();
  }

  openAssignModal(c: Complaint): void {
    this.assigningComplaint = c;
    this.showAssignModal    = true;
    this.onSelectAssignComplaint(c.id!);  // loads eligible officers
    this.cdr.detectChanges();
  }

  closeAssignModal(): void {
    this.showAssignModal    = false;
    this.assigningComplaint = null;
    this.assignOfficerId    = null;
    this.assignStatus       = '';
    this.savingAssign      = false;
    this.cdr.detectChanges();
  }

  openManageModal(c: Complaint): void {
    this.managingComplaint = c;
    this.showManageModal   = true;
    this.onSelectAssignComplaint(c.id!);
    this.onSelectUpdateComplaint(c.id!);
    this.cdr.detectChanges();
  }

  closeManageModal(): void {
    this.showManageModal   = false;
    this.managingComplaint = null;
    this.assignOfficerId   = null;
    this.assignStatus      = '';
    this.savingAssign      = false;
    this.savingUpdate      = false;
    this.cdr.detectChanges();
  }

  // ════════════════════════════════════════════════
  //  DATA
  // ════════════════════════════════════════════════

  loadComplaints(): void {
    this.loading = true;
    this.svc.getAllComplaints(0, 200).subscribe({
      next: (res: any) => {
        this.complaints = res.content ?? res;
        this.loading    = false;
        // Pre-select first unassigned in the assign panel
        const first = this.unassigned[0];
        if (first) {
          this.assignComplaintId = first.id ?? null;
          this.assignStatus      = first.status ?? 'PENDING';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Failed to load complaints.');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  viewComplaint(c: Complaint): void {
    this.selectedComplaint = c;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedComplaint = null;
    this.cdr.detectChanges();
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
  get rejected()   { return this.countByStatus('REJECTED'); }

  get unassignedCount(): number {
    return this.complaints.filter(c => !c.assignedOfficerEmail).length;
  }

  get recent(): Complaint[] {
    return this.complaints.slice(0, 6);
  }

  get unassigned(): Complaint[] {
    return this.complaints.filter(c => !c.assignedOfficerEmail);
  }

  countByStatus(status: string): number {
    return this.complaints.filter(
      c => c.status?.toUpperCase() === status.toUpperCase()
    ).length;
  }

  // ════════════════════════════════════════════════
  //  FILTERED / SORTED LIST (for complaints view)
  // ════════════════════════════════════════════════

  private priorityWeight(p?: string): number {
    switch (p?.toUpperCase()) {
      case 'HIGH':   return 3;
      case 'MEDIUM': return 2;
      case 'LOW':    return 1;
      default:       return 0;
    }
  }

  get filtered(): Complaint[] {
    let list = [...this.complaints];

    if (this.filterStatus) {
      list = list.filter(c => c.status?.toUpperCase() === this.filterStatus);
    }
    if (this.filterCategory) {
      list = list.filter(c => c.category === this.filterCategory);
    }
    // Zone — match against complaint's wardName zone
      if (this.filterZone) {
        list = list.filter(c => {
          const ward = this.allWards.find(
            (w: any) => w.wardName === c.wardName);
          return ward?.zone === this.filterZone;
        });
      }

      // Ward
      if (this.filterWard) {
        list = list.filter(c => c.wardName === this.filterWard);
      }
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.citizenEmail?.toLowerCase().includes(q) ||
        c.citizenName?.toLowerCase().includes(q)
      );
    }

    switch (this.sortBy) {
      case 'date-asc':
        list.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
        break;
      case 'date-desc':
        list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
        break;
      case 'priority-high':
        list.sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));
        break;
      case 'priority-low':
        list.sort((a, b) => this.priorityWeight(a.priority) - this.priorityWeight(b.priority));
        break;
    }

    return list;
  }
onComplaintZoneFilterChange(zone: string): void {
  this.filterWard               = '';
  this.wardsForComplaintFilter  = zone
    ? this.allWards
        .filter((w: any) => w.zone === zone)
        .sort((a: any, b: any) => a.wardNumber - b.wardNumber)
    : [];
}
clearFilters(): void {
  this.searchText              = '';
  this.filterStatus            = '';
  this.filterCategory          = '';
  this.filterZone              = '';
  this.filterWard              = '';
  this.wardsForComplaintFilter = [];
  this.sortBy                  = 'date-desc';
}

  // ════════════════════════════════════════════════
  //  ASSIGN OFFICER
  // ════════════════════════════════════════════════

  onSelectAssignComplaint(id: number): void {
    this.assignComplaintId = id;
    const c = this.complaints.find(x => x.id === id);
    if (!c) return;

    this.assignStatus = c.status ?? 'PENDING';
    this.selectedComplaintCategory = c.category ?? '';

    // If complaint has a category, fetch only eligible officers
    if (c.category) {
      this.loadingOfficers = true;
      this.eligibleOfficers = [];
      this.assignOfficerId  = null;

      this.svc.getOfficersByCategory(c.category).subscribe({
        next: (officers: any[]) => {
          this.eligibleOfficers = officers;
          this.loadingOfficers  = false;
          this.cdr.detectChanges();

          if (officers.length === 0) {
            this.toast.info('No officers available for this complaint category.');
          }
        },
        error: () => {
          // Fallback to all officers if meta endpoint fails
          this.eligibleOfficers = this.officers;
          this.loadingOfficers  = false;
          this.toast.error('Could not filter officers by category. Showing all officers.');
          this.cdr.detectChanges();
        },
      });
    } else {
      // No category set — show all officers
      this.eligibleOfficers = this.officers;
    }
  }

  assignOfficer(): void {
    if (!this.assignComplaintId) {
      this.toast.error('Please select a complaint.');
      return;
    }
    if (!this.assignOfficerId) {
      this.toast.error('Please enter an officer ID.');
      return;
    }

    this.savingAssign = true;
    this.cdr.detectChanges();
    this.svc.assignOfficer(this.assignComplaintId, this.assignOfficerId, this.assignStatus || null).subscribe({
      next: (updated: any) => {
        const idx = this.complaints.findIndex(c => c.id === this.assignComplaintId);
          if (idx !== -1) {
            this.complaints[idx] = updated;
            this.complaints = [...this.complaints];  // ← new array reference forces re-render
          }
        this.toast.success('Officer assigned successfully.');
        this.assignOfficerId = null;
        this.assignStatus = '';
        this.savingAssign = false;
        this.cdr.detectChanges();

        this.closeAssignModal();
        this.closeManageModal();
        this.loadComplaints();
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to assign officer. Check the officer ID.');
        this.savingAssign = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ════════════════════════════════════════════════
  //  UPDATE COMPLAINT STATUS
  // ════════════════════════════════════════════════

  onSelectUpdateComplaint(id: number): void {
    this.updateComplaintId = id;
    const c = this.complaints.find(x => x.id === id);
    if (c) {
      this.updateStatus  = c.status          ?? 'PENDING';
      this.updateComment = c.resolutionComment ?? '';
    }
  }

  updateComplaint(): void {
    if (!this.updateComplaintId) {
      this.toast.error('Please select a complaint.');
      return;
    }

    this.savingUpdate = true;
    const dto = {
      status:            this.updateStatus,
      resolutionComment: this.updateComment,
    };

    this.svc.updateAdminComplaint(this.updateComplaintId, dto).subscribe({
      next: (updated: any) => {
        const idx = this.complaints.findIndex(c => c.id === this.updateComplaintId);
        if (idx !== -1) this.complaints[idx] = updated;
        this.toast.success('Complaint updated successfully.');
        this.savingUpdate = false;
        this.closeManageModal();
        this.loadComplaints();
      },
      error: () => {
        this.toast.error('Failed to update complaint.');
        this.savingUpdate = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ════════════════════════════════════════════════
  //  CREATE OFFICER
  // ════════════════════════════════════════════════

  createOfficer(): void {
    if (!this.newOfficerFirstName.trim()) {
      this.toast.error('Please enter the officer first name.');
      return;
    }
    if (!this.newOfficerLastName.trim()) {
      this.toast.error('Please enter the officer last name.');
      return;
    }
    if (!this.newOfficerEmail.trim() || !this.newOfficerEmail.includes('@')) {
      this.toast.error('Please enter a valid email address.');
      return;
    }
    if (!this.newOfficerDepartment) {
      this.toast.error('Please select officer department.');
      return;
    }
    if (this.newOfficerPassword.length < 6) {
      this.toast.error('Password must be at least 6 characters.');
      return;
    }

    this.creating = true;
    this.svc.createOfficer({
      firstName:  this.newOfficerFirstName.trim(),
      lastName:   this.newOfficerLastName.trim(),
      email:      this.newOfficerEmail.trim(),
      department: this.newOfficerDepartment,
      zone:       this.newOfficerZone,
      wardId:     this.newOfficerWardId,
      password:   this.newOfficerPassword,
    }).subscribe({
      next: () => {
        this.toast.success(`Officer account created for ${this.newOfficerFirstName}.`);
        this.newOfficerFirstName  = '';
        this.newOfficerLastName   = '';
        this.newOfficerEmail      = '';
        this.newOfficerDepartment = '';
        this.newOfficerZone    = '';
        this.newOfficerWardId  = null;
        this.wardsInZone       = [];
        this.newOfficerPassword   = '';
        this.creating = false;
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to create officer account.');
        this.creating = false;
      },
    });
  }

  loadCitizens(): void {
    this.loadingUsers = true;
    this.svc.getAllCitizens().subscribe({
      next: (res: any) => {
        this.citizens = res.content ?? res;
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Failed to load citizens.');
        this.loadingUsers = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadOfficers(): void {
    this.loadingUsers = true;
    this.svc.getAllOfficers().subscribe({
      next: (res: any) => {
        this.officers         = res.content ?? res;
        this.eligibleOfficers = this.officers; // default = all officers
        this.loadingUsers     = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Failed to load officers.');
        this.loadingUsers = false;
        this.cdr.detectChanges();
      }
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
      case 'HIGH':   return 'ad-badge--high';
      case 'MEDIUM': return 'ad-badge--medium';
      case 'LOW':    return 'ad-badge--low';
      default:       return 'ad-badge--low';
    }
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':     return 'ad-badge--pending';
      case 'IN_PROGRESS': return 'ad-badge--progress';
      case 'RESOLVED':    return 'ad-badge--resolved';
      case 'REJECTED':    return 'ad-badge--rejected';
      default:            return 'ad-badge--pending';
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

  formatCategory(category: string): string {
    const names: Record<string, string> = {
      ROADS_AND_POTHOLES:  'Roads & Potholes',
      WATER_AND_DRAINAGE:  'Water & Drainage',
      STREET_LIGHTING:     'Street Lighting',
      WASTE_MANAGEMENT:    'Waste Management',
      PARKS_AND_GREENERY:  'Parks & Greenery',
      PUBLIC_BUILDINGS:    'Public Buildings',
      GENERAL:               'General',
    };
    return names[category] ?? category;
  }

  // Helper to get department name for category display
  getDeptForCategory(category: string): string {
    const map: Record<string, string> = {
      ROADS_AND_POTHOLES:  'ROADS_AND_TRANSPORTATION',
      STREET_LIGHTING:     'ELECTRICAL_SERVICES',
      WATER_AND_DRAINAGE:  'WATER_SUPPLY_AND_DRAINAGE',
      WASTE_MANAGEMENT:    'SANITATION_AND_WASTE_MANAGEMENT',
      PARKS_AND_GREENERY:  'PARKS_AND_HORTICULTURE',
      PUBLIC_BUILDINGS:    'BUILDINGS_AND_MAINTENANCE',
    };
    return map[category] ?? 'GENERAL';
  }

  formatDepartment(department: string): string {
    if (!department || department === 'null') return 'No Department';
    const names: Record<string, string> = {
      ROADS_AND_TRANSPORTATION: 'Roads & Transportation Department',
      ELECTRICAL_SERVICES: 'Electrical Services Department',
      WATER_SUPPLY_AND_DRAINAGE: 'Water Supply & Drainage Department',
      SANITATION_AND_WASTE_MANAGEMENT: 'Sanitation & Waste Management Department',
      PARKS_AND_HORTICULTURE: 'Parks & Horticulture Department',
      BUILDINGS_AND_MAINTENANCE: 'Buildings & Maintenance Department',
      GENERAL: 'General Department'
    };
    return names[department] ?? department;
  }

  getCategoryIcon(category: string | undefined): string {
    const map: Record<string, string> = {
      ROADS_AND_POTHOLES: 'bi-cone-striped',
      WATER_AND_DRAINAGE: 'bi-droplet-fill',
      STREET_LIGHTING:    'bi-lightbulb-fill',
      WASTE_MANAGEMENT:   'bi-trash-fill',
      PARKS_AND_GREENERY: 'bi-tree-fill',
      PUBLIC_BUILDINGS:   'bi-building-fill',
      ELECTRICITY:        'bi-lightning-charge-fill',
      SEWAGE:             'bi-moisture',
      NOISE_POLLUTION:    'bi-volume-up-fill',
      OTHER:              'bi-three-dots',
    };
    return category ? (map[category] ?? 'bi-tag') : 'bi-tag';
  }

  getDepartmentIcon(department: string | undefined): string {
    const map: Record<string, string> = {
      ROADS_AND_TRANSPORTATION:        'bi-cone-striped',
      ELECTRICAL_SERVICES:             'bi-lightning-charge-fill',
      WATER_SUPPLY_AND_DRAINAGE:       'bi-droplet-fill',
      SANITATION_AND_WASTE_MANAGEMENT: 'bi-trash-fill',
      PARKS_AND_HORTICULTURE:          'bi-tree-fill',
      BUILDINGS_AND_MAINTENANCE:       'bi-building-fill',
      GENERAL:                         'bi-briefcase-fill',
    };
    return department ? (map[department] ?? 'bi-building') : 'bi-building';
  }

  formatDate(d: string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  get filteredCitizens(): any[] {
    if (!this.citizenSearch.trim()) return this.citizens;
    const q = this.citizenSearch.toLowerCase();
    return this.citizens.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }

  onOfficerZoneFilterChange(zone: string): void {
    this.officerWardFilter       = '';
    this.wardsForOfficerFilter   = zone
      ? this.allWards
          .filter((w: any) => w.zone === zone)
          .sort((a: any, b: any) => a.wardNumber - b.wardNumber)
      : [];
  }

  clearOfficerFilters(): void {
    this.officerSearch           = '';
    this.officerDeptFilter       = '';
    this.officerZoneFilter       = '';
    this.officerWardFilter       = '';
    this.wardsForOfficerFilter   = [];
  }

  get filteredOfficers(): any[] {
    let result = [...this.officers];

    // Search
    if (this.officerSearch.trim()) {
      const q = this.officerSearch.toLowerCase();
      result = result.filter(o =>
        `${o.firstName} ${o.lastName}`.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q)
      );
    }

    // Department filter
    if (this.officerDeptFilter) {
      result = result.filter(o => o.department === this.officerDeptFilter);
    }

    // Zone filter
    if (this.officerZoneFilter) {
      result = result.filter(o => o.zone === this.officerZoneFilter);
    }

    // Ward filter
    if (this.officerWardFilter) {
      result = result.filter(o => o.wardName === this.officerWardFilter);
    }

    return result;
  }

  get citizensWithComplaints(): number {
    return this.citizens.filter(c => (c.complaintCount ?? 0) > 0).length;
  }

  get officersActive(): number {
    return this.officers.filter(o => (o.assignedCount ?? 0) > 0).length;
  }

  get officerDepartmentCount(): number {
    return new Set(this.officers.map(o => o.department).filter(Boolean)).size;
  }

  getNameInitials(first?: string, last?: string): string {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
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

 loadWards(): void {
   this.svc.getWards().subscribe({
     next: (data: any) => {
       this.allWards = data;
       this.cdr.detectChanges();
     },
     error: () => console.error('Failed to load wards')
   });
 }

 onZoneChange(zone: string): void {
   this.wardsInZone    = this.allWards
     .filter((w: any) => w.zone === zone)
     .sort((a: any, b: any) => a.wardNumber - b.wardNumber);
   this.newOfficerWardId = null;
 }



}
