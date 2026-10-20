'use client';
import { Button } from '@/components/ui/button';
export default function TerritoryError({reset}:{reset:()=>void}){return <main className="login-page"><section><h1>Não foi possível carregar o território</h1><p>Verifique a conexão com o Neon e tente novamente.</p><Button onClick={reset}>Tentar novamente</Button><a href="/">Voltar ao painel</a></section></main>;}
