import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ComplaintService {

  // Base URLs for each role
  private citizenUrl = '${environment.apiUrl}/citizen/complaints';
  private officerUrl = '${environment.apiUrl}/officer/complaints';
  private adminUrl   = '${environment.apiUrl}/admin/complaints';
  private fileUrl   = '${environment.apiUrl}/files';
  private metaUrl  = '${environment.apiUrl}/meta';

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════
  //  CITIZEN
  // ══════════════════════════════════════════

  createComplaint(
    title: string,
    description: string,
    priority: string,
    category: string,
    address: string,
    latitude?: number,
    longitude?: number,
    file?: File,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('priority', priority.toUpperCase());
    formData.append('category', category);
    formData.append('address',  address);
    if (latitude  != null) formData.append('latitude',  latitude.toString());
    if (longitude != null) formData.append('longitude', longitude.toString());
    if (file) {
      formData.append('attachment', file, file.name);
    }
    return this.http.post(this.citizenUrl, formData);
  }

  getMyComplaints(page = 0, size = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get(this.citizenUrl, { params });
  }

 getAttachmentUrl(attachmentPath: string): Observable<any> {
   const fileName = attachmentPath.substring(attachmentPath.lastIndexOf('/') + 1);
   return this.http.get(`${this.fileUrl}/${fileName}`, { responseType: 'blob' });
 }

  getCitizenComplaint(id: number): Observable<any> {
    return this.http.get(`${this.citizenUrl}/${id}`);
  }

  deleteComplaint(id: number): Observable<any> {
    return this.http.delete(`${this.citizenUrl}/${id}`);
  }

  updateCitizenComplaint(id: number, dto: {
    title:       string;
    description: string;
    priority:    string;
    category:    string;
    address?:    string;
    latitude?:   number | null;
    longitude?:  number | null;
  }): Observable<any> {
    return this.http.put(`${this.citizenUrl}/${id}`, dto);
  }

  // ══════════════════════════════════════════
  //  OFFICER
  // ══════════════════════════════════════════

  getAssignedComplaints(page = 0, size = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get(this.officerUrl, { params });
  }

  getOfficerComplaint(id: number): Observable<any> {
    return this.http.get(`${this.officerUrl}/${id}`);
  }

  updateOfficerComplaint(id: number, dto: {
    status?: string;
    resolutionComment?: string;
  }): Observable<any> {
    return this.http.put(`${this.officerUrl}/${id}`, dto);
  }

  // ══════════════════════════════════════════
  //  ADMIN
  // ══════════════════════════════════════════

  getAllComplaints(page = 0, size = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get(this.adminUrl, { params });
  }

  getAdminComplaint(id: number): Observable<any> {
    return this.http.get(`${this.adminUrl}/${id}`);
  }

  assignOfficer(complaintId: number, officerId: number, status?: string | null): Observable<any> {
  return this.http.put(
    `${this.adminUrl}/${complaintId}/assign/${officerId}`,
    status ? { status } : {}
  );
 }

  updateAdminComplaint(id: number, dto: {
    status?: string;
    resolutionComment?: string;
    assignedOfficerId?: number;
  }): Observable<any> {
    return this.http.put(`${this.adminUrl}/${id}`, dto);
  }

  createOfficer(dto: {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    zone:       string;
    wardId:     number | null;
    password: string;
  }): Observable<any> {
    return this.http.post(`${this.adminUrl}/create-officer`, dto);
  }

getAllCitizens(page = 0, size = 100): Observable<any> {
  const params = new HttpParams().set('page', page).set('size', size);
  return this.http.get(`${this.adminUrl}/citizens`, { params });
}

getAllOfficers(page = 0, size = 100): Observable<any> {
  const params = new HttpParams().set('page', page).set('size', size);
  return this.http.get(`${this.adminUrl}/officers`, { params });
}
getOfficersByCategory(category: string): Observable<any> {
  return this.http.get(`${this.metaUrl}/officers-by-category/${category}`);
}

 // public
 getPublicStats(): Observable<any> {
   return this.http.get('/public/stats');
 }

 getWards(): Observable<any> {
   return this.http.get('/wards');
 }

 getWardsByZone(zone: string): Observable<any> {
   return this.http.get(`/wards/zone/${zone}`);
 }

 detectWard(lat: number, lng: number): Observable<any> {
   return this.http.get(`/wards/detect?lat=${lat}&lng=${lng}`);
 }
}
