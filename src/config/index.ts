import 'dotenv/config';

const secret = (process.env.JWT_SECRET || process.env.SECRET_KEY || 'your_super_secret_key_123').trim();

export const config = {
  PORT: process.env.PORT || 3000,
  SECRET_KEY: secret,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
};

console.log(`[Config] Loaded with SECRET_KEY starting with: ${secret.substring(0, 3)}...`);
