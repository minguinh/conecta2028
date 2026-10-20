import { getDb } from '@/db/client';
import { user } from '@/db/schema';
import { localSetupAllowed } from '@/lib/user-management';
import { ActivationForm } from '@/components/activation-form';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Setup(){if(!localSetupAllowed())notFound();const users=await getDb().select({id:user.id}).from(user).limit(1);if(users.length)return <main className="login-page"><section><h1>Configuração inicial concluída</h1><p>Uma conta já foi cadastrada. O cadastro público está fechado.</p><a href="/entrar">Entrar</a></section></main>;return <ActivationForm setup/>;}
