const http = require('http');
const net = require('net');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { applySecurityHeaders } = require('../lib/security-headers');

const listenPort = Number(process.env.FRONTEND_PORT || 3000);
const defaultDevPort = listenPort === 3001 ? 3002 : 3001;
const upstreamPort = Number(process.env.DEV_FRONTEND_PORT || defaultDevPort);
const server = http.createServer((req, res) => {
 applySecurityHeaders(req, res, () => {
  const upstream = http.request({
   hostname: '127.0.0.1',
   port: upstreamPort,
   path: req.url,
   method: req.method,
   headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` }
  }, upstreamResponse => {
   const headers = {};
   for (const [name, value] of Object.entries(upstreamResponse.headers)) {
    const normalizedName = name.toLowerCase();
    if (normalizedName === 'x-powered-by' || normalizedName.startsWith('access-control-') || normalizedName === 'content-security-policy') continue;
    headers[name] = value;
   }
   res.writeHead(upstreamResponse.statusCode || 502, headers);
   upstreamResponse.pipe(res);
  });

  upstream.on('error', () => {
   if (!res.headersSent) res.statusCode = 502;
   res.end('Frontend development server is starting. Try again shortly.');
  });
  req.pipe(upstream);
 }, { development: true });
});

server.on('upgrade', (req, socket, head) => {
 const upstream = net.connect(upstreamPort, '127.0.0.1', () => {
  const headers = Object.entries(req.headers)
   .map(([name, value]) => `${name}: ${name.toLowerCase() === 'host' ? `127.0.0.1:${upstreamPort}` : Array.isArray(value) ? value.join(', ') : value}`)
   .join('\r\n');
  upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
  if (head.length) upstream.write(head);
  socket.pipe(upstream).pipe(socket);
 });
 upstream.on('error', () => socket.destroy());
 socket.on('error', () => upstream.destroy());
});

server.listen(listenPort, '127.0.0.1', () => {
 console.log(`Hardened development origin listening on http://localhost:${listenPort}`);
});
