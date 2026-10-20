import 'server-only';
import { getDb } from '@/db/client';
import { buildDashboardQuery } from './dashboard-query';
import type { Actor } from './authorization';
import { roleScope } from './permissions';
import type { DashboardData, DashboardState } from './dashboard-types';
export async function loadDashboard(actor:Actor):Promise<DashboardState>{
 if(!process.env.DATABASE_URL)return {status:'unconfigured',message:'Conecte o banco Neon para consultar os indicadores.'};
 try{const scope=roleScope(actor.role);const result=await getDb().execute(buildDashboardQuery(scope==='assigned'?actor.id:undefined));const data=result.rows[0]?.dashboard as DashboardData|undefined;if(!data)throw new Error('INVALID_DASHBOARD_RESULT');if(scope==='aggregate'){data.agenda=[];data.upcoming=[];data.latest=[];}return {status:'ready',data};}
 catch{return {status:'error',message:'Não foi possível consultar os dados. Tente novamente ou verifique a conexão com o Neon.'};}
}
