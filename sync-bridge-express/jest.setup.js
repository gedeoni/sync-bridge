/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from your .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Override database URI to use in-memory SQLite for isolated, fast, and lock-free testing
process.env.DATABASE_URI = 'sqlite::memory:';

// Set a default AUTHORIZATION_KEY for tests if not provided
process.env.AUTHORIZATION_KEY = process.env.AUTHORIZATION_KEY || 'your-secret-auth-key';
