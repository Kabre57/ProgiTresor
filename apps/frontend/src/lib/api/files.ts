const gatewayBaseUrl = process.env.NEXT_PUBLIC_API_GATEWAY ?? 'http://localhost:4000/api';

export const resolveGatewayFileUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const gateway = new URL(gatewayBaseUrl);
  const normalized = url.startsWith('/') ? url : `/${url}`;

  if (normalized.startsWith('/api/')) {
    return `${gateway.origin}${normalized}`;
  }

  if (normalized.startsWith('/uploads/')) {
    return `${gatewayBaseUrl}/analyse${normalized}`;
  }

  return `${gateway.origin}${normalized}`;
};
