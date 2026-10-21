'use client';
import { ErrorState } from '@/components/error-state';
export default function PageError({retry}:{retry:()=>void}){return <ErrorState retry={retry}/>;}
