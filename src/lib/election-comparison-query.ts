import 'server-only';
import {sql} from 'drizzle-orm';
import {getDb} from '@/db/client';
import {HttpError} from './http';
import {buildCandidateComparison,comparisonChoices,type Candidacy,type SectionCoverage,type CandidateVote} from './election-comparison';
export async function candidateComparison(params:URLSearchParams){
 const db=getDb();
 const catalog=await db.execute(sql`select distinct year,election,option,option_name name from election_results where uf='PE' and municipality='23060' and office='13' and turn=1 and year in (2016,2020,2024) and option ~ '^[0-9]{5}$' order by year,option_name,election,option`);
 const candidates=catalog.rows as Candidacy[];let selected;try{selected=comparisonChoices(candidates,params);}catch(e){throw new HttpError(400,(e as Error).message);}const choices=Object.values(selected).filter((c):c is Candidacy=>c!==null);
 if(!choices.length)return buildCandidateComparison(candidates,selected,[],[]);
 const scope=JSON.stringify(choices.map(c=>({year:c.year,election:c.election,option:c.option})));
 const [coverage,votes]=await Promise.all([
 db.execute(sql`select r.year,r.election,r.zone,r.section,min(r.place) place,min(r.place_name) "placeName" from election_results r join jsonb_to_recordset(${scope}::jsonb) as c(year int,election text,option text) on c.year=r.year and c.election=r.election where r.uf='PE' and r.municipality='23060' and r.office='13' and r.turn=1 group by r.year,r.election,r.zone,r.section order by r.year,r.zone,r.section`),
 db.execute(sql`select r.year,r.election,r.zone,r.section,r.place,r.place_name "placeName",r.option,r.votes from election_results r join jsonb_to_recordset(${scope}::jsonb) as c(year int,election text,option text) on c.year=r.year and c.election=r.election and c.option=r.option where r.uf='PE' and r.municipality='23060' and r.office='13' and r.turn=1 order by r.year,r.zone,r.section`)
 ]);
 return buildCandidateComparison(candidates,selected,coverage.rows as SectionCoverage[],votes.rows as CandidateVote[]);
}
