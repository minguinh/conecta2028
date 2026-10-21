'use client';
export default function GlobalError({retry}:{retry:()=>void}){
 return <html lang="pt-BR"><body><main id="conteudo"><h1>Não foi possível abrir o CONECTA 2028</h1><p role="alert">Tente novamente para recuperar a página.</p><button onClick={retry}>Tentar novamente</button><p><a href="/">Voltar ao painel</a></p></main></body></html>;
}
