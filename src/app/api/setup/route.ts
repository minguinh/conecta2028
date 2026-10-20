import { bootstrapAdmin,localSetupAllowed } from '@/lib/user-management';
import { body,failure,HttpError,json,sameOrigin } from '@/lib/http';
import { consumeAttempt } from '@/lib/attempt-limit';
export async function POST(request:Request){try{if(!localSetupAllowed())throw new HttpError(403,'Configuração inicial indisponível.');sameOrigin(request);const host=new URL(request.url).hostname;if(!['localhost','127.0.0.1'].includes(host))throw new HttpError(403,'Configuração somente local.');await consumeAttempt('initial-setup',5,60);await bootstrapAdmin(await body(request));return json({message:'Administrador criado. Entre com a sua conta.'},201);}catch(error){return failure(error);}}
