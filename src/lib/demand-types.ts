export const demandCategories=['Infraestrutura','Iluminação','Água e saneamento','Transporte','Limpeza urbana','Educação','Outros'] as const;
export const demandStatuses={em_andamento:'Em andamento',aguardando_retorno:'Aguardando retorno',concluida:'Concluída',cancelada:'Cancelada'} as const;
export const demandPriorities={baixa:'Baixa',normal:'Normal',alta:'Alta',urgente:'Urgente'} as const;
export type DemandStatus=keyof typeof demandStatuses;
export type DemandPriority=keyof typeof demandPriorities;
export type DemandRecord={id:string;title:string;description:string|null;category:string;status:DemandStatus;priority:DemandPriority;communityId:string|null;community:string|null;assignedTo:string|null;responsible:string|null;dueDate:string|null;resolution:string|null;closedAt:string|null;createdAt:string;updatedAt:string;version:number};
export type DemandData={demands:DemandRecord[];total:number;page:number;counts:Record<DemandStatus,number>;localities:{id:string;name:string}[];responsibles:{id:string;name:string}[]};
export type DemandHistory={id:string;action:string;createdAt:string;actor:string|null;metadata:{fields?:string[];status?:DemandStatus;version?:number}};
export const demandClosed=(status:DemandStatus)=>status==='concluida'||status==='cancelada';
