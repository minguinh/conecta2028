'use client';
import {useEffect,useRef,type ReactNode} from 'react';
/** Mount the editor before results and bring it into view, including keyboard focus. */
export function RegistrationPanel({id,children}:{id:string;children:ReactNode}){const panel=useRef<HTMLElement>(null);useEffect(()=>{const element=panel.current;if(!element)return;element.scrollIntoView({block:'start',behavior:'auto'});element.querySelector<HTMLElement>('input:not([type="hidden"]),select,textarea')?.focus({preventScroll:true});},[]);return <section ref={panel} id={id} className="territory-form-panel registration-panel" tabIndex={-1} aria-label="Formulário de cadastro">{children}</section>;}
