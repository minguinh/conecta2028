import 'server-only';
import { Pool,neonConfig } from '@neondatabase/serverless';
import { drizzle,type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
neonConfig.webSocketConstructor=globalThis.WebSocket;
type Db=NeonDatabase<typeof schema>;
export type Transaction=Parameters<Parameters<Db['transaction']>[0]>[0];
export async function transaction<T>(actorId:string|null,fn:(tx:Transaction)=>Promise<T>):Promise<T>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_NOT_CONFIGURED');
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});
 try{return await drizzle(pool,{schema}).transaction(async tx=>{await tx.execute(sql`SELECT set_config('app.actor_id',${actorId||''},true)`);return fn(tx);});}finally{await pool.end();}
}
