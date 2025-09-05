const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from your .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
