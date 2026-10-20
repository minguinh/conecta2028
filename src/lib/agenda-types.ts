export const eventKinds={compromisso:'Compromisso',visita:'Visita'} as const;
export const eventStatuses={agendada:'Agendado',concluida:'Concluído',cancelada:'Cancelado'} as const;
export type AgendaView='month'|'week'|'day';
export type AgendaEvent={id:string;title:string;description:string|null;kind:keyof typeof eventKinds;status:keyof typeof eventStatuses;scheduledAt:string;endsAt:string|null;communityId:string|null;community:string|null;assignedTo:string|null;responsible:string|null;version:number;performedAt:string|null;visitReport:string|null};
export type AgendaData={events:AgendaEvent[];localities:{id:string;name:string}[];responsibles:{id:string;name:string}[];truncated:boolean};
export function todayKey(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function dayKey(iso:string){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
export function addDays(key:string,amount:number){const d=new Date(key+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function movePeriod(key:string,view:AgendaView,amount:number){if(view!=='month')return addDays(key,amount*(view==='week'?7:1));const d=new Date(key+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+amount);return d.toISOString().slice(0,10);}
export function calendarDays(key:string,view:AgendaView){const d=new Date((view==='month'?key.slice(0,7)+'-01':key)+'T12:00:00Z');const start=view==='day'?key:addDays(d.toISOString().slice(0,10),-((d.getUTCDay()+6)%7));return Array.from({length:view==='month'?42:view==='week'?7:1},(_,i)=>addDays(start,i));}
export function eventOnDay(e:AgendaEvent,key:string){const start=new Date(key+'T00:00:00-03:00').getTime(),end=start+86400000;return new Date(e.scheduledAt).getTime()<end&&new Date(e.endsAt||new Date(new Date(e.scheduledAt).getTime()+3600000).toISOString()).getTime()>start;}
export function localDateTime(iso:string){const d=new Date(iso);return dayKey(iso)+'T'+new Intl.DateTimeFormat('en-GB',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);}
export function agendaTime(iso:string){return new Date(iso).toLocaleTimeString('pt-BR',{timeZone:'America/Fortaleza',hour:'2-digit',minute:'2-digit'});}
