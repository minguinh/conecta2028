import {assertHealthAccess,assertHealthPolicy,eligibleForErasure,type HealthPolicy,type HealthPrincipal,HealthPolicyError} from './policy';
export type ErasureJob={id:string;requestId:string;expiresAt:Date;holdUntil:Date|null};
export interface ErasureAdapters{
 /** Atomic claim rechecks current deadlines/holds and restricts access before returning object keys. */
 claimAndRestrict(job:ErasureJob,actorId:string):Promise<{objectKeys:string[]}|null>;
 deletePrivateObject(key:string):Promise<unknown>;
 /** Delete personal rows transactionally; keep only a minimal, time-limited audit receipt. */
 eraseRowsAndComplete(job:ErasureJob,actorId:string):Promise<void>;
 recordFailure(jobId:string):Promise<void>;
}
export async function executeErasure(actor:HealthPrincipal,policy:HealthPolicy,job:ErasureJob,adapters:ErasureAdapters,now=new Date()){
 assertHealthAccess(actor,'retention.execute');assertHealthPolicy(policy);if(!eligibleForErasure(job.expiresAt,job.holdUntil,now))throw new HealthPolicyError('Exclusão não elegível ou suspensa por retenção documentada.');
 const claim=await adapters.claimAndRestrict(job,actor.subjectId);if(!claim)return false;
 try{for(const key of claim.objectKeys)await adapters.deletePrivateObject(key);await adapters.eraseRowsAndComplete(job,actor.subjectId);return true;}catch(e){await adapters.recordFailure(job.id);throw e;}
}
