'use client';
import {ErrorState} from '@/components/error-state';
export default function DemandError({retry}:{retry:()=>void}){return <ErrorState title="Demandas temporariamente indisponíveis" retry={retry}/>;}
