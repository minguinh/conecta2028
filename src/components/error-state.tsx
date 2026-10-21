'use client';
import { Button } from './ui/button';
export function ErrorState({title='Não foi possível carregar esta página',retry}:{title?:string;retry:()=>void}){
 return <main id="conteudo" tabIndex={-1} className="login-page"><section aria-labelledby="error-title"><h1 id="error-title">{title}</h1><p role="alert">Tente novamente. Se o problema continuar, informe a administração.</p><Button onClick={retry}>Tentar novamente</Button><a href="/">Voltar ao painel</a></section></main>;
}
