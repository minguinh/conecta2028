import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { HttpError } from './http';
// Global endpoint limit as a second layer: no client-controlled IP can bypass it.
export async function consumeAttempt(key:string,max:number,seconds:number){const now=Date.now(),cutoff=now-seconds*1000;const result=await getDb().execute(sql`INSERT INTO "rateLimit" (id,key,count,"lastRequest") VALUES (${key},${key},1,${now}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "rateLimit"."lastRequest"<${cutoff} THEN 1 ELSE "rateLimit".count+1 END,"lastRequest"=CASE WHEN "rateLimit"."lastRequest"<${cutoff} THEN ${now} ELSE "rateLimit"."lastRequest" END RETURNING count`);if(Number(result.rows[0]?.count)>max)throw new HttpError(429,'Muitas tentativas. Aguarde um minuto.');}
