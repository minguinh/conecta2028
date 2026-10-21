import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { getTerritory } from '@/lib/territory';
import { TerritoryManager } from '@/components/territory-manager';
import { HttpError } from '@/lib/http';
export const dynamic='force-dynamic';
export default async function Territory(){let actor;try{actor=await requireActor(await headers(),'territory.read');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/entrar');return <main id="conteudo" tabIndex={-1} className="login-page"><section><h1>Acesso ao território indisponível</h1><a href="/">Voltar ao painel</a></section></main>;}const data=await getTerritory(actor);return <TerritoryManager initialData={data} role={actor.role}/>;}
