import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission,isActiveRole,roleScope } from '../src/lib/permissions';
import { buildDashboardQuery } from '../src/lib/dashboard-query';
import { PgDialect } from 'drizzle-orm/pg-core';
test('only general administrators can manage users or read global audit',()=>{for(const role of ['coordenador','assessor','analista','atendente_saude','admin','',null,undefined]){assert.equal(hasPermission(role,'users.manage'),false);assert.equal(hasPermission(role,'audit.read'),false);}assert.ok(hasPermission('administrador_geral','users.manage'));});
test('coordinator reads team while analyst cannot write operations or read team',()=>{assert.ok(hasPermission('coordenador','users.read'));assert.ok(hasPermission('coordenador','operations.write'));assert.equal(hasPermission('analista','operations.write'),false);assert.equal(hasPermission('analista','users.read'),false);});
test('future healthcare role is not assignable and has no permissions',()=>{assert.equal(isActiveRole('atendente_saude'),false);for(const permission of ['dashboard.read','users.manage','history.self'] as const)assert.equal(hasPermission('atendente_saude',permission),false);});
test('advisor query uses bound assignment parameters, never client-controlled role',()=>{assert.equal(roleScope('assessor'),'assigned');assert.equal(roleScope('analista'),'aggregate');const attacker="id' OR true --";const query=new PgDialect().sqlToQuery(buildDashboardQuery(attacker));assert.ok(query.params.includes(attacker));assert.equal(query.sql.includes(attacker),false);assert.match(query.sql,/assigned_to = \$\d/);});
