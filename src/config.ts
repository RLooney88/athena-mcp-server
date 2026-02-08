// Environment Configuration for Athena MCP Server

export interface Config {
  apiUrl: string;
  authToken: string;
  environment: 'development' | 'test' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  requestTimeout: number;
}

function loadConfig(): Config {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';
  
  let apiUrl: string;
  let logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  switch (env) {
    case 'production':
      apiUrl = process.env.PROD_API_URL || '';
      logLevel = 'warn';
      break;
    case 'test':
      apiUrl = process.env.TEST_API_URL || '';
      logLevel = 'debug';
      break;
    default:
      apiUrl = process.env.DEV_API_URL || process.env.API_URL || 'http://localhost:3000';
      logLevel = 'debug';
  }
  
  if (process.env.API_URL) {
    apiUrl = process.env.API_URL;
  }
  
  const authToken = process.env.AUTH_TOKEN || '';
  
  if (!apiUrl && env !== 'development') {
    throw new Error('API_URL environment variable is not set');
  }
  
  if (!authToken && env !== 'development') {
    throw new Error('AUTH_TOKEN environment variable is not set');
  }
  
  return {
    apiUrl,
    authToken,
    environment: env,
    logLevel,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
  };
}

export const config = loadConfig();

export function getApiUrl(): string {
  return config.apiUrl;
}

export function getAuthToken(): string {
  return config.authToken;
}

export function isDevelopment(): boolean {
  return config.environment === 'development';
}

export function isTest(): boolean {
  return config.environment === 'test';
}

export function isProduction(): boolean {
  return config.environment === 'production';
}

export function getRequestTimeout(): number {
  return config.requestTimeout;
}
