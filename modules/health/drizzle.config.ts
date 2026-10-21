import {existsSync} from 'node:fs';
import {defineConfig} from 'drizzle-kit';
if(existsSync('modules/health/.env.local'))process.loadEnvFile('modules/health/.env.local');
export default defineConfig({schema:'./modules/health/schema.ts',out:'./modules/health/migrations',dialect:'postgresql',dbCredentials:{url:process.env.HEALTH_DATABASE_URL_UNPOOLED||''},strict:true});
