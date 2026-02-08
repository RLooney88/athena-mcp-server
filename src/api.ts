// Athena API Client
import axios, { AxiosError } from 'axios';
import { config } from './config';

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

function createApiClient() {
  const client = axios.create({
    baseURL: config.apiUrl,
    timeout: config.requestTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.authToken}`,
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        console.error(`[API] Error ${status}: ${message}`);
        return Promise.reject(new AthenaApiError(message, status, error.response.data?.code));
      } else if (error.request) {
        console.error('[API] Network error:', error.message);
        return Promise.reject(new AthenaApiError('Network error', 0));
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export class AthenaApiError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = 'AthenaApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export const api = createApiClient();

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  return searchParams.toString();
}
