import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
export function getDb(){const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_NOT_CONFIGURED');return drizzle(neon(url));}
