import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { getContacts } from '@/lib/contacts';
import { HttpError } from '@/lib/http';
import { ContactManager } from '@/components/contact-manager';
export const dynamic='force-dynamic';
export default async function Contacts(){let actor;try{actor=await requireActor(await headers(),'operations.read');}catch(e){if(e instanceof HttpError&&e.status===401)redirect('/entrar');return <main className="login-page"><section><h1>Acesso aos contatos indisponível</h1><a href="/">Voltar ao painel</a></section></main>;}return <ContactManager initialData={await getContacts(actor,new URLSearchParams())}/>;}
