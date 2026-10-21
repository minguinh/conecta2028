'use client';
import {usePathname} from 'next/navigation';
import {CalendarDays,ChartNoAxesColumn,ClipboardList,HeartPulse,Home,MapPinned,Users,UsersRound} from 'lucide-react';
import {hasPermission,type Permission,type Role} from '@/lib/permissions';
const links=[['/','Painel',Home,'dashboard.read'],['/territorio','Localidades',MapPinned,'territory.read'],['/contatos','Contatos',Users,'operations.read'],['/agenda','Agenda',CalendarDays,'operations.read'],['/demandas','Demandas',ClipboardList,'operations.read'],['/eleicoes','Eleições',ChartNoAxesColumn,'reports.read'],['/usuarios','Equipe',UsersRound,'users.read'],['/saude','Saúde',HeartPulse,'users.manage']] as const;
export function WorkspaceNavigation({role}:{role:Role}){const path=usePathname();return <nav className="workspace-navigation" aria-label="Módulos e cadastros">{links.filter(([, , ,permission])=>hasPermission(role,permission as Permission)).map(([href,label,Icon])=><a key={href} href={href} aria-current={path===href?'page':undefined}><Icon size={17} aria-hidden="true"/>{label}</a>)}</nav>;}
