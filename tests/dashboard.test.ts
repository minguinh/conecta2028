import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { dashboardQuery } from '../src/lib/dashboard-query';
test('dashboard aggregates real tables with no fabricated fallback records',()=>{
 const {sql}=new PgDialect().sqlToQuery(dashboardQuery);
 for(const table of ['contacts','communities','visits','demands','activities'])assert.match(sql,new RegExp(`FROM ${table}`,'i'));
 assert.match(sql,/coalesce.*'\[\]'::json/is);
 assert.doesNotMatch(sql,/generate_series|INSERT\s+INTO/i);
});
test('agenda uses a half-open Fortaleza day and ignores cancelled visits',()=>{
 const {sql}=new PgDialect().sqlToQuery(dashboardQuery);
 assert.match(sql,/America\/Fortaleza/);assert.match(sql,/v\.scheduled_at>=b\.start_at AND v\.scheduled_at<b\.end_at/);assert.match(sql,/v\.status='agendada'/);
});
