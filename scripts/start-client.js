const path = require('path');
// PORT belongs to the API. React must not inherit it from the shared .env file.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
// Keep the development server behind scripts/dev-proxy.js on the public local port.
const publicPort = Number(process.env.FRONTEND_PORT || 3000);
const defaultDevPort = publicPort === 3001 ? 3002 : 3001;
process.env.PORT = process.env.DEV_FRONTEND_PORT || String(defaultDevPort);
// Bind to loopback but tell webpack-dev-server to allow localhost as a host,
// otherwise it rejects allowedHosts[0] as an empty string on react-scripts 5.
process.env.HOST = '127.0.0.1';
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';
require('react-scripts/scripts/start');
