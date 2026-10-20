export const legalBases = {consentimento:'Consentimento',obrigacao_legal:'Obrigação legal ou regulatória',politica_publica:'Execução de política pública',contrato:'Execução de contrato',legitimo_interesse:'Legítimo interesse documentado'} as const;
export type LegalBasis=keyof typeof legalBases;
export type ContactDraft={name:string;phone:string;communityId:string;address:string|null;notes:string|null;legalBasis:LegalBasis;purpose:string;legalEvidence:string;allowWhatsapp:boolean;allowSms:boolean;allowCalls:boolean;communicationEvidence:string|null;version:number};
export type ContactRecord=ContactDraft&{id:string;community:string;assignedTo:string|null;updatedAt:string;authorizationAt:string|null};
export type ContactData={contacts:ContactRecord[];total:number;page:number;localities:{id:string;name:string}[]};
