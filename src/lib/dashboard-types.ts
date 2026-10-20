export type DashboardData = {
  counts: { contacts:number; communities:number; scheduledVisits:number; openDemands:number };
  communities: {id:string; name:string; latitude:number|null; longitude:number|null}[];
  byLocality: {name:string; count:number}[];
  agenda: {id:string; title:string; community:string|null; scheduledAt:string}[];
  byCategory: {name:string; count:number}[];
  latest: {id:string; title:string; community:string|null; occurredAt:string}[];
};
export type DashboardState = { status:'ready'; data:DashboardData } | {status:'unconfigured'|'error'|'unauthenticated'; message:string};
