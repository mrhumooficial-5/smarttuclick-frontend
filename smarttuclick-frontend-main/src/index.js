const API_ORIGIN = 'https://smarttuclick-api.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API → Render
    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      const target = new URL(
        url.pathname + url.search,
        API_ORIGIN
      );

      const upstreamRequest = new Request(target.toString(), request);

      const response = await fetch(upstreamRequest);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Web → archivos de public/
    return env.ASSETS.fetch(request);
  },
};
