import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'CONECTA 2028 | Gestão comunitária',description:'Gestão de contatos, comunidades, visitas e demandas.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><a className="skip-link" href="#conteudo">Pular para o conteúdo</a>{children}</body></html>;}
