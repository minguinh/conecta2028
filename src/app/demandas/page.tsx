import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireActor} from '@/lib/authorization';
import {getDemands} from '@/lib/demands';
import {HttpError} from '@/lib/http';
import {DemandManager} from '@/components/demand-manager';
export const dynamic='force-dynamic';
export default async function Demands(){let actor;try{actor=await requireActor(await headers(),'operations.read');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/entrar');if(e instanceof HttpError&&e.status===403)return <main id="conteudo" tabIndex={-1} className="login-page"><section><h1>Acesso às demandas restrito</h1><p>Seu perfil não permite consultar registros operacionais.</p><a href="/">Voltar ao painel</a></section></main>;throw e;}return <DemandManager initialData={await getDemands(actor,new URLSearchParams())} actorId={actor.id} role={actor.role}/>;}
