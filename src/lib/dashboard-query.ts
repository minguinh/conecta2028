import { sql } from 'drizzle-orm';
// One SQL statement gives all sections the same PostgreSQL snapshot.
// Calendar boundaries are computed in Fortaleza, independent of host timezone.
export function buildDashboardQuery(assignedTo?:string){const scope=assignedTo?sql`assigned_to = ${assignedTo}`:sql`true`;return sql`
WITH allowed_contacts AS (SELECT * FROM contacts WHERE ${scope}),
allowed_visits AS (SELECT * FROM visits WHERE ${scope}),
allowed_demands AS (SELECT * FROM demands WHERE ${scope}),
allowed_activities AS (SELECT * FROM activities WHERE ${scope}),
allowed_communities AS (SELECT * FROM communities WHERE ${assignedTo ? sql`id IN (SELECT community_id FROM allowed_contacts UNION SELECT community_id FROM allowed_visits UNION SELECT community_id FROM allowed_demands UNION SELECT community_id FROM allowed_activities)` : sql`true`}),
day_bounds AS (
 SELECT (date_trunc('day',now() AT TIME ZONE 'America/Fortaleza') AT TIME ZONE 'America/Fortaleza') AS start_at,
 ((date_trunc('day',now() AT TIME ZONE 'America/Fortaleza') + interval '1 day') AT TIME ZONE 'America/Fortaleza') AS end_at
)
SELECT json_build_object(
 'counts',json_build_object(
  'contacts',(SELECT count(*)::int FROM allowed_contacts),
  'communities',(SELECT count(*)::int FROM allowed_communities),
  'scheduledVisits',(SELECT count(*)::int FROM allowed_visits WHERE status='agendada' AND scheduled_at>=now()),
  'openDemands',(SELECT count(*)::int FROM allowed_demands WHERE status='em_andamento')),
 'communities',coalesce((SELECT json_agg(r) FROM (SELECT id,name,latitude,longitude FROM allowed_communities ORDER BY name)r),'[]'::json),
 'byLocality',coalesce((SELECT json_agg(r) FROM (SELECT coalesce(c.name,'Sem localidade') AS name,count(a.id)::int AS count FROM allowed_activities a LEFT JOIN allowed_communities c ON c.id=a.community_id GROUP BY c.id,c.name ORDER BY count(a.id) DESC,coalesce(c.name,'Sem localidade'))r),'[]'::json),
 'agenda',coalesce((SELECT json_agg(r) FROM (SELECT v.id,v.title,c.name AS community,v.scheduled_at AS "scheduledAt" FROM allowed_visits v LEFT JOIN allowed_communities c ON c.id=v.community_id CROSS JOIN day_bounds b WHERE v.status='agendada' AND v.scheduled_at>=b.start_at AND v.scheduled_at<b.end_at ORDER BY v.scheduled_at,v.id)r),'[]'::json),
 'byCategory',coalesce((SELECT json_agg(r) FROM (SELECT category AS name,count(*)::int AS count FROM allowed_demands GROUP BY category ORDER BY count(*) DESC,category)r),'[]'::json),
 'latest',coalesce((SELECT json_agg(r) FROM (SELECT a.id,a.title,c.name AS community,a.occurred_at AS "occurredAt" FROM allowed_activities a LEFT JOIN allowed_communities c ON c.id=a.community_id ORDER BY a.occurred_at DESC,a.id DESC LIMIT 10)r),'[]'::json)
) AS dashboard`;
}
export const dashboardQuery=buildDashboardQuery();
