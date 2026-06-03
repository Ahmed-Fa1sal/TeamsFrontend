/**
 * Shared Interfaces
 * Common interfaces used across the application
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
