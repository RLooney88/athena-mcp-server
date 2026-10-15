export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const environment = env.NODE_ENV || 'development';
  const apiUrl = env.API_URL || (environment === 'production' ? env.PROD_API_URL : environment === 'test' ? env.TEST_API_URL : env.DEV_API_URL);
  const apiKey = env.ATHENA_API_KEY || '';
  const authToken = env.AUTH_TOKEN || (environment === 'production' ? env.PROD_AUTH_TOKEN : environment === 'test' ? env.TEST_AUTH_TOKEN : '') || '';
  if (!apiUrl) throw new Error('API_URL is required (Athena origin, without /api/v1)');
  const url = new URL(apiUrl);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('API_URL must be an origin without credentials, query or path');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('API_URL must use HTTPS, except loopback tests');
  if (!apiKey && !authToken) throw new Error('ATHENA_API_KEY or AUTH_TOKEN is required; there is no automatic mock mode');
  const requestTimeout = Number(env.REQUEST_TIMEOUT || '30000');
  if (!Number.isInteger(requestTimeout) || requestTimeout < 1 || requestTimeout > 120000) throw new Error('REQUEST_TIMEOUT must be 1..120000 milliseconds');
  return {apiUrl: url.origin, apiKey, authToken, requestTimeout};
}
export type Config = ReturnType<typeof loadConfig>;
