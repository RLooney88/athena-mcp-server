import type { Config } from './config.js';

export class AthenaApiError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string, public requestId?: string) { super(message); }
}

export function createApi(config: Config) {
  return async (method: string, path: string, body?: unknown, options: {idempotencyKey?: string; legacy?: boolean} = {}) => {
    if (options.legacy && !config.authToken) throw new AthenaApiError(401, 'legacy_auth_required', 'This mobile compatibility tool requires AUTH_TOKEN. Core v1 tools use ATHENA_API_KEY.');
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (!options.legacy && config.apiKey) headers['x-api-key'] = config.apiKey;
    else headers.Authorization = `Bearer ${config.authToken}`;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    let response: Response;
    try {
      response = await fetch(config.apiUrl + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(config.requestTimeout), redirect: 'error'});
    } catch {
      throw new AthenaApiError(0, 'transport_error', 'Request failed or timed out. Outcome may be unknown. For v1 writes retry only with the same idempotency_key and payload; reconcile legacy writes before retrying.');
    }
    const content = await response.text();
    let data: any;
    try { data = content ? JSON.parse(content) : null; } catch { throw new AthenaApiError(response.status, 'invalid_response', 'API returned a non-JSON response'); }
    if (!response.ok) {
      const error = data?.error || data?.detail?.error;
      throw new AthenaApiError(response.status, error?.code || 'api_error', error?.message || (typeof data?.detail === 'string' ? data.detail : `HTTP ${response.status}: request rejected`), error?.request_id);
    }
    return data;
  };
}
export type Api = ReturnType<typeof createApi>;
