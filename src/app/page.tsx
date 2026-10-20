import { headers } from 'next/headers';
import { Dashboard } from '@/components/dashboard';
import { requireActor } from '@/lib/authorization';
import { HttpError } from '@/lib/http';
import type { Actor } from '@/lib/authorization';
import { loadDashboard } from '@/lib/dashboard';
import type { DashboardState } from '@/lib/dashboard-types';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function Home(){
 let state:DashboardState;let actor:Actor|undefined;
 if(!process.env.DATABASE_URL)state={status:'unconfigured',message:'Conecte o banco Neon para consultar os indicadores.'};
 else if(!process.env.BETTER_AUTH_SECRET||!process.env.BETTER_AUTH_URL)state={status:'unconfigured',message:'Banco conectado. Configure a autenticação para acessar o painel.'};
 else try{actor=await requireActor(await headers(),'dashboard.read');state=await loadDashboard(actor);}
 catch(error){state=error instanceof HttpError?{status:'unauthenticated',message:error.message}:{status:'error',message:'Não foi possível carregar o painel. Verifique a conexão com o Neon.'};}
 return <Dashboard initialState={state} userName={actor?.name} userRole={actor?.role}/>;
}
