SMARTTCLICK - MISMO WORKER (FRONTEND + API PROXY)

Este paquete convierte SmartTuClick en una app de Cloudflare Workers Static Assets + Worker.
El navegador ya NO llama a stc-api-proxy-2026.mrhumofficial.workers.dev.
Ahora llama al mismo origen:
  https://smarttuclick.mrhumofficial.workers.dev/api/...

Arquitectura:
  navegador -> smarttuclick.mrhumofficial.workers.dev -> Render -> Neon

IMPORTANTE:
El paquete necesita desplegarse como Worker con Static Assets (Wrangler/configuracion de Worker),
no como la pantalla antigua de "Upload static files" que solo acepta archivos estaticos.

Archivos:
  src/index.js      proxy /api/* y /health hacia Render
  public/           frontend SmartTuClick
  wrangler.json     configura Worker + Static Assets

No se modifico ni elimina el Worker stc-api-proxy-2026.
