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
app.use('/api/auth', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, require('./auth-api'));
app.use('/api/auth/mfa', require('./mfa-api'));
// Only authentication and published job browsing are public. New APIs are private by default.
app.use('/api', (req, res, next) => {
 if (['GET', 'HEAD'].includes(req.method) && req.path === '/careers/jobs') return next();
 return require('./session').requireUser(req, res, error => error ? next(error) : require('./session').requireMfa(req, res, next));
});
app.use('/api/careers', require('./careers-api'));
app.use('/api/recruiter', require('./recruiter-api'));
app.use('/api/profile', require('./profile-api'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));
app.use(express.static(path.join(__dirname, 'build')));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, 'build/index.html')));
app.use((err, req, res, next) => {
 console.error('Request failed:', err);
 const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.status || 500);
 const genericMessages = {
  400: 'Please check your request and try again.',
  401: 'Please log in again.',
  403: 'You do not have permission to do that.',
  404: 'The requested item could not be found.',
  409: 'This request conflicts with existing information.',
  413: 'Resume must be under 10 MB.',
  429: 'Too many requests. Please wait and try again.',
  503: 'The service is temporarily unavailable. Please try again later.'
 };
 res.status(status >= 400 && status < 600 ? status : 500).json({
  message: err.publicMessage || genericMessages[status] || 'Something went wrong. Please try again.'
 });
});
if (require.main === module) app.listen(process.env.PORT || 5000, () => console.log('High5 running on port ' + (process.env.PORT || 5000)));
module.exports = app;
