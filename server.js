const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'uploads/temp'), { recursive: true });
const express = require('express');
const app = express();
// Caddy and the React development proxy connect locally. Never trust arbitrary remote proxies.
app.set('trust proxy', 'loopback');
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./auth-api'));
// Only authentication and published job browsing are public. New APIs are private by default.
app.use('/api', (req, res, next) => {
 if (['GET', 'HEAD'].includes(req.method) && req.path === '/careers/jobs') return next();
 return require('./session').requireUser(req, res, next);
});
app.use('/api/careers', require('./careers-api'));
app.use('/api/recruiter', require('./recruiter-api'));
app.use('/api/profile', require('./profile-api'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));
app.use(express.static(path.join(__dirname, 'build')));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'build/index.html')));
app.use((err, req, res, next) => {
 console.error(err.message);
 const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.status || 500);
 res.status(status).json({ message: status < 500 || status === 503 ? (status === 413 ? 'Resume must be under 10 MB' : err.message) : 'Request failed. Please try again.' });
});
if (require.main === module) app.listen(process.env.PORT || 5000, () => console.log('High5 running on port ' + (process.env.PORT || 5000)));
module.exports = app;
