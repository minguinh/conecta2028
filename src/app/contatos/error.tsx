'use client';
import { Button } from '@/components/ui/button';
export default function ContactError({reset}:{reset:()=>void}){return <main className="login-page"><section><h1>Contatos temporariamente indisponíveis</h1><p>Não foi possível consultar o banco. Tente novamente.</p><Button onClick={reset}>Tentar novamente</Button><a href="/">Voltar ao painel</a></section></main>;}
