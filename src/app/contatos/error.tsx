'use client';
import { ErrorState } from '@/components/error-state';
export default function PageError({retry}:{retry:()=>void}){return <ErrorState title="Contatos temporariamente indisponível" retry={retry}/>;}
