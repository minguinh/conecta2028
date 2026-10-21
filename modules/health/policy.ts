/** Independent service contracts. Principals MUST come from verified identity + server memberships. */
export const healthRoles=['atendente_saude','supervisor_saude','encarregado_privacidade_saude'] as const;
export type HealthRole=typeof healthRoles[number];
export type HealthPermission='request.read'|'request.write'|'document.read'|'document.write'|'basis.manage'|'audit.read'|'retention.execute';
export type HealthPrincipal={subjectId:string;role:string;active:boolean;authenticated:boolean};
export type HealthRecordScope={assignedTo:string;restricted:boolean;expiresAt:string};
export type HealthPolicy={version:string;approvedAt:string;approvedBy:string;retentionDays:number;auditRetentionDays:number;backupRetentionDays:number};
const grants:Record<HealthRole,readonly HealthPermission[]>={atendente_saude:['request.read','request.write','document.read','document.write','basis.manage'],supervisor_saude:['request.read','request.write','document.read','document.write','basis.manage','audit.read'],encarregado_privacidade_saude:['basis.manage','audit.read','retention.execute']};
export class HealthPolicyError extends Error{}
export function assertHealthAccess(principal:HealthPrincipal,permission:HealthPermission,record?:HealthRecordScope){
 if(!principal.authenticated||!principal.active||!principal.subjectId||!Object.hasOwn(grants,principal.role)||!grants[principal.role as HealthRole].includes(permission))throw new HealthPolicyError('Acesso específico de saúde necessário.');
 if(record&&(!Number.isFinite(Date.parse(record.expiresAt))||Date.parse(record.expiresAt)<=Date.now()&&permission!=='retention.execute'&&principal.role!=='encarregado_privacidade_saude'||record.restricted&&permission!=='retention.execute'&&permission!=='basis.manage'||principal.role==='atendente_saude'&&record.assignedTo!==principal.subjectId))throw new HealthPolicyError('Solicitação restrita, expirada ou fora da sua responsabilidade.');
}
export function assertHealthPolicy(policy:HealthPolicy|undefined){if(!policy||!policy.version.trim()||!policy.approvedBy.trim()||!Number.isFinite(Date.parse(policy.approvedAt))||Date.parse(policy.approvedAt)>Date.now()||![policy.retentionDays,policy.auditRetentionDays,policy.backupRetentionDays].every(n=>Number.isInteger(n)&&n>0&&n<=36500))throw new HealthPolicyError('Defina e aprove a política de retenção antes de tratar dados.');return policy;}
export type LegalBasisRecord={kind:'consentimento'|'outra_base_aprovada';purpose:string;reference:string;noticeVersion:string;recordedAt:string;approvedBy:string;consented:boolean;revokedAt:string|null};
export function assertLegalBasis(basis:LegalBasisRecord){if(!['consentimento','outra_base_aprovada'].includes(basis.kind)||![basis.purpose,basis.reference,basis.noticeVersion,basis.approvedBy].every(v=>typeof v==='string'&&v.trim().length>0&&v.length<=1000)||!Number.isFinite(Date.parse(basis.recordedAt))||Date.parse(basis.recordedAt)>Date.now()||basis.revokedAt||basis.kind==='consentimento'&&basis.consented!==true)throw new HealthPolicyError('Base legal e evidência válidas são necessárias.');}
export const administrativeStatuses=['recebida','documentacao_pendente','encaminhada','aguardando_retorno','encerrada','cancelada'] as const;
export type AdministrativeStatus=typeof administrativeStatuses[number];
export function assertAdministrativeTransition(from:AdministrativeStatus,to:unknown){if(!administrativeStatuses.includes(from)||!administrativeStatuses.includes(to as AdministrativeStatus)||['encerrada','cancelada'].includes(from)||from===to)throw new HealthPolicyError('Transição administrativa inválida.');}
export function newHealthProtocol(now=new Date()){return `SAU-${now.getUTCFullYear()}-${crypto.randomUUID().replaceAll('-','').toUpperCase()}`;}
export function retentionDeadline(createdAt:Date,policy:HealthPolicy){assertHealthPolicy(policy);if(!Number.isFinite(createdAt.getTime()))throw new HealthPolicyError('Data inválida.');return new Date(createdAt.getTime()+policy.retentionDays*86400000);}
export function eligibleForErasure(expiresAt:Date,holdUntil:Date|null,now=new Date()){return Number.isFinite(expiresAt.getTime())&&expiresAt<=now&&(!holdUntil||Number.isFinite(holdUntil.getTime())&&holdUntil<=now);}
