#!/usr/bin/env node
/* =========================================================
   命途回廊 · COINFALL — 本地 AI 代理（可选）
   ---------------------------------------------------------
   作用：把 API Key 留在服务端环境变量里，浏览器只访问本代理。
   用法（PowerShell）：
     $env:UPSTREAM_KEY="sk-..."
     node tools/ai-proxy.mjs
   游戏 → 设置 → AI 接口：
     Base URL: http://127.0.0.1:8788/v1
     Model   : deepseek1017
     API Key : local-proxy   （随便填，代理不校验）
   注意：公开部署时请把本文件部署到支持 HTTPS 的服务端，
         并加上鉴权 / 速率限制；不要直接把 Key 写进前端。
   ========================================================= */
import http from 'node:http';

const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || '127.0.0.1';
const UPSTREAM = (process.env.UPSTREAM_BASE || 'https://maas.qianwenaiapi.com/compatible-mode/v1').replace(/\/+$/, '');
const KEY = process.env.UPSTREAM_KEY || '';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

if (!KEY) {
  console.error('缺少环境变量 UPSTREAM_KEY。示例：');
  console.error('  PowerShell: $env:UPSTREAM_KEY="sk-..."; node tools/ai-proxy.mjs');
  console.error('  bash:       UPSTREAM_KEY=sk-... node tools/ai-proxy.mjs');
  process.exit(1);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !/^\/v1\/chat\/completions\/?$/.test((req.url || '').split('?')[0])) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: 'POST /v1/chat/completions only' } }));
    return;
  }

  let body = '';
  try {
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2_000_000) throw new Error('payload too large');
    }
  } catch (err) {
    res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: err.message } }));
    return;
  }

  try {
    const upstream = await fetch(UPSTREAM + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY
      },
      body
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(text);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: '上游请求失败：' + err.message } }));
  }
});

server.listen(PORT, HOST, () => {
  console.log('AI 代理已启动：http://' + HOST + ':' + PORT + '/v1');
  console.log('上游：' + UPSTREAM);
  console.log('把游戏里 AI Base URL 填成上面的地址，Key 随便填（例如 local-proxy）。');
});