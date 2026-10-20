import { activateUser } from '@/lib/user-management';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { consumeAttempt } from '@/lib/attempt-limit';
export async function POST(request:Request){try{sameOrigin(request);await consumeAttempt('activation',10,60);await activateUser(await body(request));return json({message:'Conta ativada. Você já pode entrar.'});}catch(error){return failure(error);}}
