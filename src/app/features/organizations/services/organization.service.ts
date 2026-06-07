import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@features/auth/services/auth.service';
import { getApiUrl } from '@core/config/api.config';
import { ApiResponse, PagedResponse } from '@shared/interfaces/common.interfaces';
import {
  AddOrganizationMemberRequest,
  CreateOrganizationRequest,
  OrganizationMemberResponse,
  OrganizationMemberRole,
  OrganizationResponse,
  Pageable,
  UpdateMemberRoleRequest,
  UpdateOrganizationRequest
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private pageParams(pageable?: Pageable): HttpParams {
    let p = new HttpParams();
    if (pageable?.page !== undefined) p = p.set('page', pageable.page);
    if (pageable?.size !== undefined) p = p.set('size', pageable.size);
    if (pageable?.sort) p = p.set('sort', pageable.sort);
    return p;
  }

  // ── Organizations ────────────────────────────────────────────────────────────

  createOrganization(data: CreateOrganizationRequest): Observable<OrganizationResponse> {
    return this.http
      .post<ApiResponse<OrganizationResponse>>(getApiUrl('/organizations'), data, { headers: this.headers() })
      .pipe(map(r => r.data!));
  }

  getAllOrganizations(pageable?: Pageable): Observable<PagedResponse<OrganizationResponse>> {
    return this.http
      .get<ApiResponse<PagedResponse<OrganizationResponse>>>(
        getApiUrl('/organizations'), { headers: this.headers(), params: this.pageParams(pageable) }
      )
      .pipe(map(r => r.data!));
  }

  searchOrganizations(query: string, pageable?: Pageable): Observable<PagedResponse<OrganizationResponse>> {
    const params = this.pageParams(pageable).set('query', query);
    return this.http
      .get<ApiResponse<PagedResponse<OrganizationResponse>>>(
        getApiUrl('/organizations/search'), { headers: this.headers(), params }
      )
      .pipe(map(r => r.data!));
  }

  getMyOrganizations(pageable?: Pageable): Observable<PagedResponse<OrganizationResponse>> {
    return this.http
      .get<ApiResponse<PagedResponse<OrganizationResponse>>>(
        getApiUrl('/organizations/my'), { headers: this.headers(), params: this.pageParams(pageable) }
      )
      .pipe(map(r => r.data!));
  }

  getOrganizationById(id: number): Observable<OrganizationResponse> {
    return this.http
      .get<ApiResponse<OrganizationResponse>>(getApiUrl(`/organizations/${id}`), { headers: this.headers() })
      .pipe(map(r => r.data!));
  }

  updateOrganization(id: number, data: UpdateOrganizationRequest): Observable<OrganizationResponse> {
    return this.http
      .put<ApiResponse<OrganizationResponse>>(getApiUrl(`/organizations/${id}`), data, { headers: this.headers() })
      .pipe(map(r => r.data!));
  }

  deleteOrganization(id: number): Observable<void> {
    return this.http.delete<void>(getApiUrl(`/organizations/${id}`), { headers: this.headers() });
  }

  activateOrganization(id: number): Observable<OrganizationResponse> {
    return this.http
      .patch<ApiResponse<OrganizationResponse>>(
        getApiUrl(`/organizations/${id}/activate`), {}, { headers: this.headers() }
      )
      .pipe(map(r => r.data!));
  }

  deactivateOrganization(id: number): Observable<OrganizationResponse> {
    return this.http
      .patch<ApiResponse<OrganizationResponse>>(
        getApiUrl(`/organizations/${id}/deactivate`), {}, { headers: this.headers() }
      )
      .pipe(map(r => r.data!));
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  addMember(orgId: number, data: AddOrganizationMemberRequest): Observable<OrganizationMemberResponse> {
    return this.http
      .post<ApiResponse<OrganizationMemberResponse>>(
        getApiUrl(`/organizations/${orgId}/members`), data, { headers: this.headers() }
      )
      .pipe(map(r => r.data!));
  }

  getMembers(
    orgId: number,
    pageable?: Pageable,
    role?: OrganizationMemberRole
  ): Observable<PagedResponse<OrganizationMemberResponse>> {
    let params = this.pageParams(pageable);
    if (role) params = params.set('role', role);
    return this.http
      .get<ApiResponse<PagedResponse<OrganizationMemberResponse>>>(
        getApiUrl(`/organizations/${orgId}/members`), { headers: this.headers(), params }
      )
      .pipe(map(r => r.data!));
  }

  getMember(orgId: number, userId: number): Observable<OrganizationMemberResponse> {
    return this.http
      .get<ApiResponse<OrganizationMemberResponse>>(
        getApiUrl(`/organizations/${orgId}/members/${userId}`), { headers: this.headers() }
      )
      .pipe(map(r => r.data!));
  }

  updateMemberRole(
    orgId: number,
    userId: number,
    data: UpdateMemberRoleRequest
  ): Observable<OrganizationMemberResponse> {
    return this.http
      .patch<ApiResponse<OrganizationMemberResponse>>(
        getApiUrl(`/organizations/${orgId}/members/${userId}/role`), data, { headers: this.headers() }
      )
      .pipe(map(r => r.data!));
  }

  removeMember(orgId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      getApiUrl(`/organizations/${orgId}/members/${userId}`), { headers: this.headers() }
    );
  }

  leaveOrganization(orgId: number): Observable<void> {
    return this.http.delete<void>(
      getApiUrl(`/organizations/${orgId}/members/me/leave`), { headers: this.headers() }
    );
  }
}
