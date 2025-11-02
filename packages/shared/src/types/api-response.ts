/**
 * Generic API response type
 */
export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}
