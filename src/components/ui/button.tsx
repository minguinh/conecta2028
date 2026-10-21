'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { default: 'bg-[#B90F13] text-white hover:bg-[#8F0B0E]', outline: 'border border-stone-200 bg-white hover:bg-orange-50', ghost: 'hover:bg-black/5' }, size: { default: 'h-10 px-4', sm: 'h-8 px-3 text-xs', icon: 'size-10' } }, defaultVariants: { variant: 'default', size: 'default' } });
const subscribe=()=>()=>{};
const clientReady=()=>true;
const serverReady=()=>false;
export const useClientReady=()=>React.useSyncExternalStore(subscribe,clientReady,serverReady);
export function Button({ className, variant, size, asChild = false, disabled, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
 const ready=useClientReady();
 const Comp=asChild?Slot:'button';
 // Native links work before hydration; action buttons must wait for their handlers.
 return <Comp className={cn(buttonVariants({variant,size,className}))} {...props} disabled={disabled||(!asChild&&!ready)} aria-busy={!asChild&&!ready?true:props['aria-busy']}/>;
}
