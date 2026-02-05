/**
 * Fetch client interface for dependency injection
 */

/**
 * Minimal fetch client interface used by auth strategies
 */
export interface FetchClient {
  post<T>(url: string, body: object): Promise<{ data: { data: T } }>;
}
