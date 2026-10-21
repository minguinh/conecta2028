export const roleLabels={administrador_geral:'Administrador geral',coordenador:'Coordenador',assessor:'Assessor',analista:'Analista',atendente_saude:'Atendente de saúde (futuro)'} as const;
export type Role=keyof typeof roleLabels;
export const activeRoles=['administrador_geral','coordenador','assessor','analista'] as const;
export type Permission='territory.read'|'territory.manage'|'dashboard.read'|'operations.read'|'operations.write'|'reports.read'|'users.read'|'users.manage'|'audit.read'|'history.self';
export const roleGrants:Record<Role,readonly Permission[]>={
 administrador_geral:['territory.read','territory.manage','dashboard.read','operations.read','operations.write','reports.read','users.read','users.manage','audit.read','history.self'],
 coordenador:['territory.read','territory.manage','dashboard.read','operations.read','operations.write','reports.read','users.read','history.self'],
 assessor:['territory.read','dashboard.read','operations.read','operations.write','history.self'],
 analista:['territory.read','dashboard.read','reports.read','history.self'],
 atendente_saude:[],
};
export function isRole(value:unknown):value is Role{return typeof value==='string'&&Object.hasOwn(roleLabels,value);}
export function isActiveRole(value:unknown):value is typeof activeRoles[number]{return typeof value==='string'&&(activeRoles as readonly string[]).includes(value);}
export function hasPermission(role:unknown,permission:Permission){return isRole(role)&&roleGrants[role].includes(permission);}
export function roleScope(role:Role):'all'|'assigned'|'aggregate'{return role==='assessor'?'assigned':role==='analista'?'aggregate':'all';}
