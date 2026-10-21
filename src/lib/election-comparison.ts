export const comparisonYears=[2016,2020,2024] as const;
export type ComparisonYear=typeof comparisonYears[number];
export const comparisonName='DOMINGOS LEANDRO DA FONSECA JUNIOR';
/** Explicit public candidacy mapping checked against the official municipal CSVs. */
export const comparisonDefaults={2016:{election:'220',option:'45555',candidateSequence:'170000013481'},2020:{election:'426',option:'40000',candidateSequence:'170000747959'},2024:{election:'619',option:'45000',candidateSequence:'170002130211'}} as const;
export type Candidacy={year:ComparisonYear;election:string;option:string;name:string};
export type SectionCoverage={year:ComparisonYear;election:string;zone:number;section:number;place:string;placeName:string};
export type CandidateVote=SectionCoverage&{option:string;votes:number};
export type ComparisonCell={votes:number|null;place:string|null;placeName:string|null;covered:boolean};
export type ComparisonSection={zone:number;section:number;cells:Record<ComparisonYear,ComparisonCell>;difference:number|null};
export type CandidateComparison={catalog:Candidacy[];selected:Record<ComparisonYear,Candidacy|null>;totals:{year:ComparisonYear;candidate:Candidacy|null;votes:number|null;sectionsWithRecords:number;sectionsInElection:number;zones:number[]}[];sections:ComparisonSection[]};
export function comparisonChoices(catalog:Candidacy[],params:URLSearchParams):Record<ComparisonYear,Candidacy|null>{
 return Object.fromEntries(comparisonYears.map(year=>{const value=params.get('candidate'+year);if(value!==null){if(!/^\d{1,6}:\d{5}$/.test(value))throw new Error('Identificador de candidatura inválido.');const match=catalog.find(c=>c.year===year&&`${c.election}:${c.option}`===value);if(!match)throw new Error('Candidatura indisponível neste ano e município.');return [year,match];}
 const preset=comparisonDefaults[year];return [year,catalog.find(c=>c.year===year&&c.election===preset.election&&c.option===preset.option&&c.name===comparisonName)||null];})) as Record<ComparisonYear,Candidacy|null>;
}
export function buildCandidateComparison(catalog:Candidacy[],selected:Record<ComparisonYear,Candidacy|null>,coverage:SectionCoverage[],votes:CandidateVote[]):CandidateComparison{
 const sections=new Map<string,ComparisonSection>();
 const empty=():ComparisonCell=>({votes:null,place:null,placeName:null,covered:false});
 const ensure=(r:SectionCoverage)=>{const key=`${r.zone}:${r.section}`;if(!sections.has(key))sections.set(key,{zone:r.zone,section:r.section,cells:{2016:empty(),2020:empty(),2024:empty()},difference:null});return sections.get(key)!;};
 for(const r of coverage){if(selected[r.year]?.election!==r.election)continue;ensure(r).cells[r.year]={votes:null,place:r.place,placeName:r.placeName,covered:true};}
 for(const r of votes){const c=selected[r.year];if(!c||c.election!==r.election||c.option!==r.option)continue;const cell=ensure(r).cells[r.year];if(cell.votes!==null)throw new Error('Duplicate candidate section aggregate');Object.assign(cell,{votes:r.votes,place:r.place,placeName:r.placeName,covered:true});}
 const rows=Array.from(sections.values()).sort((a,b)=>a.zone-b.zone||a.section-b.section);
 for(const r of rows){const before=r.cells[2020].votes,after=r.cells[2024].votes;r.difference=before===null||after===null?null:after-before;}
 return {catalog,selected,sections:rows,totals:comparisonYears.map(year=>({year,candidate:selected[year],votes:selected[year]&&rows.some(r=>r.cells[year].votes!==null)?rows.reduce((sum,r)=>sum+(r.cells[year].votes??0),0):null,sectionsWithRecords:rows.filter(r=>r.cells[year].votes!==null).length,sectionsInElection:rows.filter(r=>r.cells[year].covered).length,zones:Array.from(new Set(rows.filter(r=>r.cells[year].covered).map(r=>r.zone))).sort((a,b)=>a-b)}))};
}
export function comparisonCsv(data:CandidateComparison){const quote=(v:unknown)=>`"${String(v??'Sem registro').replaceAll('"','""')}"`;const headers=['Zona','Seção',...comparisonYears.map(y=>`Votos ${y} - ${data.selected[y]?.option||'Sem candidatura'} - ${data.selected[y]?.name||''}`),'Diferença 2024 menos 2020'];return '\uFEFF'+[headers,...data.sections.map(r=>[r.zone,r.section,r.cells[2016].votes,r.cells[2020].votes,r.cells[2024].votes,r.difference])].map(row=>row.map(quote).join(';')).join('\r\n');}
