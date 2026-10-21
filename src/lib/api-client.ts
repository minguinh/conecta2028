/** Shared transport for authenticated browser operations. No infrastructure credentials. */
export async function api(path:string,method='GET',data?:unknown,signal?:AbortSignal){
 let response:Response;
 try{response=await fetch(path,{method,cache:'no-store',signal,headers:data===undefined?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});}catch(error){if(signal?.aborted)throw error;throw new Error('Sem conexão. Verifique sua internet e tente novamente.');}
 const result=await response.json().catch(()=>null);
 if(response.status===401)throw new Error('Sua sessão expirou. Entre novamente para continuar.');
 if(!response.ok)throw new Error(result?.message||'Não foi possível concluir. Tente novamente.');
 if(result===null)throw new Error('Resposta indisponível. Atualize a página e tente novamente.');
 return result;
}
