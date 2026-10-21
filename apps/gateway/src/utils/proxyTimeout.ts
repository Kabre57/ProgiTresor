const importRoutes = new Set([
  '/api/transactions/import', '/api/transactions/import-file',
  '/api/etudiant/import', '/api/etudiant/import-referential',
]);

export function getProxyTimeoutMs(routePath: string): number {
  const importRoute = importRoutes.has(routePath.replace(/\/$/, ''));
  const configured = importRoute ? process.env.GATEWAY_IMPORT_TIMEOUT_MS : process.env.GATEWAY_PROXY_TIMEOUT_MS;
  const fallback = importRoute ? 15 * 60 * 1000 : 30 * 1000;
  const value = Number(configured ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
