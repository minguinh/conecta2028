import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { getAgenda } from '@/lib/agenda';
import { HttpError } from '@/lib/http';
import { todayKey,calendarDays,addDays } from '@/lib/agenda-types';
import { AgendaManager } from '@/components/agenda-manager';
export const dynamic='force-dynamic';
export default async function Agenda(){let actor;try{actor=await requireActor(await headers(),'operations.read');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/entrar');return <main id="conteudo" tabIndex={-1} className="login-page"><section><h1>Acesso à agenda indisponível</h1><a href="/">Voltar ao painel</a></section></main>;}const anchor=todayKey(),days=calendarDays(anchor,'month');return <AgendaManager initialData={await getAgenda(actor,new URLSearchParams({from:days[0],to:addDays(days[days.length-1],1)}))} initialAnchor={anchor} actorId={actor.id} role={actor.role}/>;}
