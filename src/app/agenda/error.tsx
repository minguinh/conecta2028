'use client';
import { Button } from '@/components/ui/button';
export default function AgendaError({reset}:{reset:()=>void}){return <main className="login-page"><section><h1>Agenda temporariamente indisponível</h1><p>Não foi possível consultar os compromissos.</p><Button onClick={reset}>Tentar novamente</Button><a href="/">Voltar ao painel</a></section></main>;}
