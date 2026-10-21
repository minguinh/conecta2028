import {WorkspaceNavigation} from '@/components/workspace-navigation';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { roleLabels } from '@/lib/permissions';
import { AccountPanel } from '@/components/account-panel';
export const dynamic='force-dynamic';
export default async function Account(){let actor;try{actor=await requireActor(await headers());}catch{redirect('/entrar');}return <main id="conteudo" tabIndex={-1} className="management-page"><WorkspaceNavigation role={actor.role}/><AccountPanel name={actor.name} email={actor.email} role={roleLabels[actor.role]}/></main>;}
