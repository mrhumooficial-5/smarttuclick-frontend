const API_ORIGIN = 'https://smarttuclick-api.onrender.com';
const FRONTEND_ORIGIN = 'https://smarttuclick.mrhumofficial.workers.dev';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      const target = new URL(url.pathname + url.search, API_ORIGIN);
      const headers = new Headers(request.headers);
      headers.delete('Origin');
      headers.delete('Host');

      const upstreamRequest = new Request(target.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      const response = await fetch(upstreamRequest);
      const responseHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders())) {
        responseHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
