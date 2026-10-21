import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {requireActor} from '@/lib/authorization';
import {HttpError} from '@/lib/http';
import {ElectionManager} from '@/components/election-manager';
export const dynamic='force-dynamic';
export default async function Elections(){let actor;try{actor=await requireActor(await headers(),'reports.read');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/entrar');if(e instanceof HttpError&&e.status===403)return <main id="conteudo" tabIndex={-1} className="login-page"><section><h1>Acesso restrito</h1><a href="/">Voltar ao painel</a></section></main>;throw e;}return <ElectionManager role={actor.role}/>;}
