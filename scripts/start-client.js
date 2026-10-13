const path = require('path');
// PORT belongs to the API. React must not inherit it from the shared .env file.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
process.env.PORT = process.env.FRONTEND_PORT || '3000';
require('react-scripts/scripts/start');
