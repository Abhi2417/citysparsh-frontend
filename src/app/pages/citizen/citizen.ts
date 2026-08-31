import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ComplaintService } from '../../core/services/complaint.service';
import { AuthService } from '../../core/services/auth';

export enum Priority {
  Low    = 'LOW',
  Medium = 'MEDIUM',
  High   = 'HIGH',
}

export interface Complaint {
  id?:             number;
  title:           string;
  description:     string;
  priority:        Priority | string;
  category?:       string;
  status?:         string;
  fileName?:       string;
  file?:           File;
  attachmentName?: string;
  attachmentPath?: string;
  address:        string;
  latitude?:       number;
  longitude?:      number;
  assignedOfficerName?:  string;
  createdAt?:      string;
  updatedAt?:      string;
  resolvedAt?:     string;
  resolutionComment?:    string;
}

type ActiveView = 'dashboard' | 'list' | 'form' | 'detail';

@Component({
  selector: 'app-citizen',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './citizen.html',
  styleUrl: './citizen.scss',
})
export class CitizenComponent implements OnInit {

  activeView: ActiveView = 'dashboard';

  // Form state
  submitted     = false;
  submitSuccess  = false;
  submitError   = '';
  isLoading     = true; // ← starts true so template waits for HTTP before rendering
  isSubmitting = false;
  isDragging    = false;

  // update complaint
  selectedComplaint: Complaint | null = null;
  isUpdating = false;
  updateError = '';
  updateSuccess = false;

  updateForm = {
    title:       '',
    description: '',
    priority:    '',
    category:    '',
    address:     '',
    latitude:    null as number | null,
    longitude:   null as number | null,
  };

 // for complaint filter
  listSearch         = '';
  listCategoryFilter = '';

  // ── Location ──────────────────────────────────────
  locationQuery    = '';
  detectingLocation = false;
  private map:     any = null;
  private marker:  any = null;

  //update location
  private updateMap:    any = null;
  private updateMarker: any = null;
  updateLocationQuery   = '';
  detectingUpdateLocation = false;

  // detect ward and zone
  detectedWard   = '';
  detectedWardId: number | null = null;
  detectedZone   = '';

  // update
  updateDetectedWard = '';
  updateDetectedZone = '';


  priorities = [
    { label: 'Low',    value: Priority.Low    },
    { label: 'Medium', value: Priority.Medium  },
    { label: 'High',   value: Priority.High   },
  ];

  categories = [
    { label: 'Roads & Potholes',     value: 'ROADS_AND_POTHOLES'  },
    { label: 'Water & Drainage',     value: 'WATER_AND_DRAINAGE'  },
    { label: 'Street Lighting',      value: 'STREET_LIGHTING'      },
    { label: 'Waste Management',     value: 'WASTE_MANAGEMENT'     },
    { label: 'Parks & Greenery',     value: 'PARKS_AND_GREENERY'   },
    { label: 'Public Buildings',     value: 'PUBLIC_BUILDINGS'     },
    { label: 'Other',                value: 'OTHER'                },
  ];

  form: Complaint = this.emptyForm();

  complaints: Complaint[] = [];

  fileUrl = '/files';

  sidebarOpen = false;

  constructor(
    private complaintService: ComplaintService,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadMyComplaints();
  }

  get username(): string {
    return this.auth.getUserName();
  }

  // ─── Navigation ──────────────────────────────────────────────
 setView(view: ActiveView): void {
   this.activeView = view;
   this.closeSidebar();
   this.resetFormState();
    if (view === 'form') {
       this.initMap();       // ← init when form opens
     }else if (view === 'detail') {
          this.initUpdateMap();
     }else {
       this.destroyMap();   // ← destroy when leaving form
       this.destroyUpdateMap();
     }
 }

  logout(): void {
    this.auth.logout();
  }

  getFileNameFromPath(attachmentPath: string | undefined | null): string {
        if (!attachmentPath) return '';
        return attachmentPath.substring(attachmentPath.lastIndexOf('/') + 1);
  }

  // ─── Data ────────────────────────────────────────────────────
 loadMyComplaints(): void {
   this.isLoading = true;
   this.complaintService.getMyComplaints(0, 100).subscribe({
     next: (data: any) => {
       this.complaints = data.content ?? data;
       this.isLoading  = false;
       this.cdr.detectChanges();  // ← force view update
     },
     error: (err: any) => {
       console.error('Failed to load complaints', err);
       this.isLoading = false;
       this.cdr.detectChanges();  // ← force view update
     },
   });
 }

  get recentComplaints(): Complaint[] {
    return this.complaints.slice(0, 5);
  }

  countByStatus(status: string): number {
    return this.complaints.filter(c =>
      c.status?.toUpperCase() === status.toUpperCase()
    ).length;
  }

  // ─── File handling ───────────────────────────────────────────
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.form.file     = input.files[0];
      this.form.fileName = input.files[0].name;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.form.file     = files[0];
      this.form.fileName = files[0].name;
    }
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.form.file     = undefined;
    this.form.fileName = '';
    this.clearFileInput();
  }

  private clearFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  // ─── Submit ──────────────────────────────────────────────────
  isFormValid(): boolean {
    return !!(this.form.title?.trim() && this.form.description?.trim() && this.form.priority &&
     this.form.category && this.form.address?.trim());
  }

  submitComplaint(): void {
    this.submitted   = true;
    this.submitError = '';

    if (!this.isFormValid()) return;

    this.isSubmitting = true;

    this.complaintService.createComplaint(
      this.form.title,
      this.form.description,
      this.form.priority as Priority,
      this.form.category ?? '',
      this.form.address  ?? '',
      this.form.latitude ?? undefined,
      this.form.longitude ?? undefined,
      this.form.file,
    ).subscribe({
      next: (_res: any) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        setTimeout(() => {
          this.resetForm();
          this.setView('dashboard');
          this.loadMyComplaints();
        }, 1500);
      },
      error: (err: any) => {
        this.isSubmitting  = false;
        this.submitError = err?.error ?? 'Failed to submit complaint. Please try again.';
      },
    });
  }

  // ─── Delete ──────────────────────────────────────────────────
 deleteComplaint(id: number | undefined, index: number): void {
   if (!id) return;

   const confirmed = confirm('Are you sure you want to delete this complaint?');
   if (!confirmed) return;

   this.complaintService.deleteComplaint(id).subscribe({
     next: () => {
       this.complaints.splice(index, 1);
       this.cdr.detectChanges();
     },
     error: (err: any) => {
       console.error('Failed to delete complaint', err);
       alert(err?.error?.error ?? err?.error?.message ?? 'Failed to delete complaint. Please try again.');
     },
   });
 }

  // ─── Helpers ─────────────────────────────────────────────────
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
      case 'HIGH':   return 'p-high';
      case 'MEDIUM': return 'p-med';
      case 'LOW':    return 'p-low';
      default:       return 'p-low';
    }
  }

  getStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':     return 'b-pending';
      case 'IN_PROGRESS': return 'b-progress';
      case 'RESOLVED':    return 'b-resolved';
      case 'REJECTED':    return 'b-rejected';
      default:            return 'b-pending';
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

  // ─── Form reset ──────────────────────────────────────────────
  private emptyForm(): Complaint {
    return {
      title:       '',
      description: '',
      priority:    Priority.Low,
      category:    '',
      fileName:    '',
      file:        undefined,
      address:     '',
      latitude:    undefined,
      longitude:   undefined,
    };
  }

  resetForm(): void {
    this.form          = this.emptyForm();
    this.submitted     = false;
    this.submitSuccess  = false;
    this.submitError   = '';
    this.updateError    = '';
    this.updateSuccess  = false;
    this.isUpdating     = false;
    this.isSubmitting  = false;
    this.isDragging    = false;
    this.listSearch        = '';
    this.listCategoryFilter = '';
    this.clearFileInput();
  }

  private resetFormState(): void {
    this.submitted     = false;
    this.submitSuccess  = false;
    this.submitError   = '';
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

  formatCategory(category: string | undefined): string {
    const map: Record<string, string> = {
      ROADS_AND_POTHOLES: 'Roads & Potholes',
      WATER_AND_DRAINAGE: 'Water & Drainage',
      STREET_LIGHTING:    'Street Lighting',
      WASTE_MANAGEMENT:   'Waste Management',
      PARKS_AND_GREENERY: 'Parks & Greenery',
      PUBLIC_BUILDINGS:   'Public Buildings',
      ELECTRICITY:        'Electricity',
      SEWAGE:             'Sewage',
      NOISE_POLLUTION:    'Noise Pollution',
      OTHER:              'Other',
    };
    return category ? (map[category] ?? category) : '—';
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

  // update complaint related methods
  viewComplaintDetail(c: Complaint): void {
    this.selectedComplaint = c;
    this.updateDetectedWard = '';
    this.updateDetectedZone = '';
    this.updateForm = {
      title:       c.title,
      description: c.description,
      priority:    c.priority as string,
      category:    c.category ?? '',
      address:     c.address   ?? '',
      latitude:    c.latitude  ?? null,
      longitude:   c.longitude ?? null,
    };
    this.setView('detail');
  }

  isUpdateFormValid(): boolean {
    return !!(
      this.updateForm.title?.trim() &&
      this.updateForm.description?.trim() &&
      this.updateForm.priority &&
      this.updateForm.category
    );
  }

  updateComplaint(): void {
    if (!this.selectedComplaint?.id) return;
    if (!this.isUpdateFormValid()) return;

    this.isUpdating  = true;
    this.updateError = '';

    this.complaintService.updateCitizenComplaint(
      this.selectedComplaint.id,
      {
        title:       this.updateForm.title,
        description: this.updateForm.description,
        priority:    this.updateForm.priority,
        category:    this.updateForm.category,
        address:     this.updateForm.address,
        latitude:    this.updateForm.latitude,
        longitude:   this.updateForm.longitude,
      }
    ).subscribe({
      next: (updated: any) => {
        // Update in local array
        const idx = this.complaints.findIndex(c => c.id === this.selectedComplaint?.id);
        if (idx !== -1) this.complaints[idx] = updated;
        this.isUpdating    = false;
        this.updateSuccess = true;
        setTimeout(() => {
          this.updateSuccess = false;
          this.destroyUpdateMap();
          this.loadMyComplaints();
          this.setView('list');
        }, 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isUpdating  = false;
        this.updateError = err?.error?.message ?? 'Failed to update complaint.';
        this.cdr.detectChanges();
      },
    });
  }

  get filteredComplaints(): Complaint[] {
    let result = this.complaints;

    // Filter by title search
    if (this.listSearch.trim()) {
      const q = this.listSearch.toLowerCase();
      result = result.filter(c =>
        c.title?.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (this.listCategoryFilter) {
      result = result.filter(c =>
        c.category === this.listCategoryFilter
      );
    }

    return result;
  }

  // ── Location ──────────────────────────────────────
  // Call after form view is shown
  initMap(): void {
    setTimeout(() => {
      if (this.map) return; // already initialized
      const L = (window as any).L;
      if (!L) return;

      this.map = L.map('complaint-map').setView([20.5937, 78.9629], 5); // India center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      this.map.on('click', (e: any) => {
        this.placeMarker(e.latlng.lat, e.latlng.lng);
      });
    }, 100);
  }

  placeMarker(lat: number, lng: number): void {
    const L = (window as any).L;
    if (!L) return;

    if (this.marker) this.map.removeLayer(this.marker);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.reverseGeocode(pos.lat, pos.lng);
    });

    this.form.latitude  = lat;
    this.form.longitude = lng;
    this.reverseGeocode(lat, lng);
  }

  reverseGeocode(lat: number, lng: number): void {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        this.form.address = data.display_name
          ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.form.address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.cdr.detectChanges();
      });

    // Ward detection from your backend
    this.complaintService.detectWard(lat, lng).subscribe({
      next: (res: any) => {
        if (res.detected) {
          this.detectedWard   = res.wardName;
          this.detectedWardId = res.wardId;
          this.detectedZone   = res.zone;
        } else {
          this.detectedWard   = '';
          this.detectedWardId = null;
          this.detectedZone   = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.detectedWard = '';
      }
    });
  }

  searchLocation(): void {
    if (!this.locationQuery.trim()) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.locationQuery)}&format=json&limit=1`)
      .then(r => r.json())
      .then(results => {
        if (results.length > 0) {
          const { lat, lon } = results[0];
          this.map.setView([+lat, +lon], 15);
          this.placeMarker(+lat, +lon);
        }
      });
  }

  detectLocation(): void {
    if (!navigator.geolocation) return;
    this.detectingLocation = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.map.setView([latitude, longitude], 15);
        this.placeMarker(latitude, longitude);
        this.detectingLocation = false;
        this.cdr.detectChanges();
      },
      () => {
        this.detectingLocation = false;
        this.cdr.detectChanges();
      }
    );
  }

  clearLocation(): void {
    this.form.address   = '';
    this.form.latitude  = undefined;
    this.form.longitude = undefined;
    this.detectedWard   = '';
    this.detectedWardId = null;
    this.detectedZone   = '';
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map   = null;
      this.marker = null;
    }
  }

  // update location

  initUpdateMap(): void {
    setTimeout(() => {
      if (this.updateMap) return;
      const L = (window as any).L;
      if (!L) return;

      // Center on existing location if available, else India center
      const lat = this.updateForm.latitude  ?? 20.5937;
      const lng = this.updateForm.longitude ?? 78.9629;
      const zoom = this.updateForm.latitude ? 15 : 5;

      this.updateMap = L.map('update-complaint-map').setView([lat, lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.updateMap);

       // Pre-place marker + detect ward for existing location
          if (this.updateForm.latitude && this.updateForm.longitude) {
            this.placeUpdateMarker(
              this.updateForm.latitude,
              this.updateForm.longitude,
              false  // don't reverse geocode address — already have it
            );
            // ← detect ward for existing coordinates
            this.complaintService.detectWard(
              this.updateForm.latitude,
              this.updateForm.longitude
            ).subscribe({
              next: (res: any) => {
                if (res.detected) {
                  this.updateDetectedWard = res.wardName;
                  this.updateDetectedZone = res.zone;
                  this.cdr.detectChanges();
                }
              }
            });
          }

      this.updateMap.on('click', (e: any) => {
        this.placeUpdateMarker(e.latlng.lat, e.latlng.lng, true);
      });
    }, 100);
  }

  placeUpdateMarker(lat: number, lng: number, reverseGeocode: boolean): void {
    const L = (window as any).L;
    if (!L || !this.updateMap) return;

    if (this.updateMarker) this.updateMap.removeLayer(this.updateMarker);

    this.updateMarker = L.marker([lat, lng], { draggable: true }).addTo(this.updateMap);

    this.updateMarker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.reverseGeocodeUpdate(pos.lat, pos.lng);
    });

    this.updateForm.latitude  = lat;
    this.updateForm.longitude = lng;

    if (reverseGeocode) this.reverseGeocodeUpdate(lat, lng);
  }

  reverseGeocodeUpdate(lat: number, lng: number): void {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        this.updateForm.address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.updateForm.address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.cdr.detectChanges();
      });
      // : Ward detection
    this.complaintService.detectWard(lat, lng).subscribe({
        next: (res: any) => {
          if (res.detected) {
            this.updateDetectedWard = res.wardName;
            this.updateDetectedZone = res.zone;
          } else {
            this.updateDetectedWard = '';
            this.updateDetectedZone = '';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.updateDetectedWard = '';
          this.updateDetectedZone = '';
        }
      });
  }

  searchUpdateLocation(): void {
    if (!this.updateLocationQuery.trim()) return;
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(this.updateLocationQuery)}&format=json&limit=1`)
      .then(r => r.json())
      .then(results => {
        if (results.length > 0) {
          const { lat, lon } = results[0];
          this.updateMap.setView([+lat, +lon], 15);
          this.placeUpdateMarker(+lat, +lon, true);
        }
      });
  }

  detectUpdateLocation(): void {
    if (!navigator.geolocation) return;
    this.detectingUpdateLocation = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        this.updateMap.setView([latitude, longitude], 15);
        this.placeUpdateMarker(latitude, longitude, true);
        this.detectingUpdateLocation = false;
        this.cdr.detectChanges();
      },
      () => {
        this.detectingUpdateLocation = false;
        this.cdr.detectChanges();
      }
    );
  }

  clearUpdateLocation(): void {
    this.updateForm.address   = '';
    this.updateForm.latitude  = null;
    this.updateForm.longitude = null;
    this.updateDetectedWard    = '';
    this.updateDetectedZone    = '';
    if (this.updateMarker && this.updateMap) {
      this.updateMap.removeLayer(this.updateMarker);
      this.updateMarker = null;
    }
  }

  destroyUpdateMap(): void {
    if (this.updateMap) {
      this.updateMap.remove();
      this.updateMap    = null;
      this.updateMarker = null;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
