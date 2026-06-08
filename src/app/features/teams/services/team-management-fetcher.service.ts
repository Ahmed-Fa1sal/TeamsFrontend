import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG, getApiUrl } from '@core/config/api.config';
import {
  ApiResponse,
  SpringPage,
  Team,
  CreateTeamRequest,
  CreateChannelRequest,
  UpdateTeamRequest,
  TeamQueryParams,
} from '../models/team.models';

@Injectable({ providedIn: 'root' })
export class TeamManagementFetcherService {
  private readonly http = inject(HttpClient);

  private get endpoints() {
    return API_CONFIG.ENDPOINTS.TEAMS;
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  getAllTeams(params?: TeamQueryParams): Observable<SpringPage<Team>> {
    return this.http
      .get<ApiResponse<SpringPage<Team>>>(getApiUrl(this.endpoints.BASE), {
        params: this.buildPageParams(params),
      })
      .pipe(map(r => this.unwrapResponse(r)));
  }

  getMyTeams(params?: TeamQueryParams): Observable<SpringPage<Team>> {
    return this.http
      .get<ApiResponse<SpringPage<Team>>>(getApiUrl(this.endpoints.MY_TEAMS), {
        params: this.buildPageParams(params),
      })
      .pipe(map(r => this.unwrapResponse(r)));
  }

  getTeamById(id: number): Observable<Team> {
    return this.http
      .get<ApiResponse<Team>>(getApiUrl(`${this.endpoints.BASE}/${id}`))
      .pipe(map(r => this.unwrapResponse(r)));
  }

  searchTeams(query: string, params?: TeamQueryParams): Observable<SpringPage<Team>> {
    const httpParams = this.buildPageParams(params).set('query', query);
    return this.http
      .get<ApiResponse<SpringPage<Team>>>(getApiUrl(this.endpoints.SEARCH), {
        params: httpParams,
      })
      .pipe(map(r => this.unwrapResponse(r)));
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  createTeam(request: CreateTeamRequest): Observable<Team> {
    return this.http
      .post<ApiResponse<Team>>(getApiUrl(this.endpoints.BASE), request)
      .pipe(map(r => this.unwrapResponse(r)));
  }

  createChannel(teamId: number, request: CreateChannelRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(getApiUrl(`${API_CONFIG.ENDPOINTS.CHANNELS}/${teamId}`), request)
      .pipe(map(r => this.unwrapVoid(r)));
  }

  updateTeam(id: number, request: UpdateTeamRequest): Observable<Team> {
    return this.http
      .put<ApiResponse<Team>>(getApiUrl(`${this.endpoints.BASE}/${id}`), request)
      .pipe(map(r => this.unwrapResponse(r)));
  }

  deleteTeam(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(getApiUrl(`${this.endpoints.BASE}/${id}`))
      .pipe(map(r => this.unwrapVoid(r)));
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  addTeamMember(teamId: number, userId: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(
        getApiUrl(`${this.endpoints.BASE}/${teamId}/members/${userId}`),
        {},
      )
      .pipe(map(r => this.unwrapVoid(r)));
  }

  removeTeamMember(teamId: number, userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        getApiUrl(`${this.endpoints.BASE}/${teamId}/members/${userId}`),
      )
      .pipe(map(r => this.unwrapVoid(r)));
  }

  // ── Archive ─────────────────────────────────────────────────────────────────

  archiveTeam(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(
        getApiUrl(`${this.endpoints.BASE}/${id}/archive`),
        {},
      )
      .pipe(map(r => this.unwrapVoid(r)));
  }

  unarchiveTeam(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(
        getApiUrl(`${this.endpoints.BASE}/${id}/unarchive`),
        {},
      )
      .pipe(map(r => this.unwrapVoid(r)));
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private buildPageParams(params?: TeamQueryParams): HttpParams {
    let p = new HttpParams()
      .set('page', String(params?.page ?? 0))
      .set('size', String(params?.size ?? 10));
    if (params?.sort) {
      p = p.set('sort', params.sort);
    }
    return p;
  }

  private unwrapResponse<T>(response: ApiResponse<T>): T {
    return response.data;
  }

  private unwrapVoid(_response: ApiResponse<unknown>): void {
    // void operations — data payload is not consumed
  }
}
