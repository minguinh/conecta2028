import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb } from '@/db/client';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isActiveRole } from './permissions';
export function getAuth(){
 if(!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL)throw new Error('AUTH_NOT_CONFIGURED');
 return betterAuth({
  appName:'CONECTA 2028',secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL,
  trustedOrigins:[new URL(process.env.BETTER_AUTH_URL).origin],
  database:drizzleAdapter(getDb(),{provider:'pg',schema,transaction:false}),
  emailAndPassword:{enabled:true,disableSignUp:true,minPasswordLength:12,maxPasswordLength:128,revokeSessionsOnPasswordReset:true},
  user:{additionalFields:{role:{type:'string',defaultValue:'analista',input:false},active:{type:'boolean',defaultValue:false,input:false}}},
  session:{expiresIn:60*60*8,updateAge:60*15,freshAge:60*10,cookieCache:{enabled:false}},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:5}}},
  advanced:{useSecureCookies:process.env.NODE_ENV==='production',defaultCookieAttributes:{httpOnly:true,sameSite:'lax'},ipAddress:{ipAddressHeaders:process.env.NODE_ENV==='production'?['cf-connecting-ip']:[]}},
  databaseHooks:{session:{create:{before:async value=>{
   const [row]=await getDb().select({active:schema.user.active,role:schema.user.role}).from(schema.user).where(eq(schema.user.id,value.userId));
   if(!row?.active||!isActiveRole(row.role))return false;
   return {data:value};
  }}}},
 });
}
