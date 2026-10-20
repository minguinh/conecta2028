// Deploy exactly the current Git commit after its Linux CI has passed.
import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const run=(exe,args,options={})=>execFileSync(exe,args,{cwd:root,stdio:'inherit',windowsHide:true,...options});
const readGit=args=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
if(readGit(['status','--porcelain']))throw Error('Salve e faça commit das alterações antes de publicar.');
const sha=readGit(['rev-parse','HEAD']);
run('git',['push','origin','main']);
const credential=spawnSync('git',['-c','credential.interactive=never','credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',windowsHide:true});
const token=credential.stdout?.match(/^password=(.+)$/m)?.[1];
if(!token)throw Error('Autentique o Git Credential Manager para consultar o CI.');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'};
const base='https://api.github.com/repos/minguinh/conecta2028';
async function get(url){const r=await fetch(url,{headers});if(!r.ok)throw Error(`GitHub respondeu ${r.status}.`);return r;}
let ci;
for(let attempt=0;attempt<90;attempt++){
 const runs=await (await get(`${base}/actions/runs?head_sha=${sha}&per_page=10`)).json();
 ci=runs.workflow_runs.find(r=>r.path==='.github/workflows/check.yml');
 if(ci?.status==='completed')break;
 if(attempt%6===0)console.log('Aguardando testes e compilação Linux do commit '+sha.slice(0,7));
 await new Promise(resolve=>setTimeout(resolve,10000));
}
if(ci?.conclusion!=='success')throw Error('Publicação interrompida: CI não concluiu com sucesso. '+(ci?.html_url||''));
const list=await (await get(`${base}/actions/runs/${ci.id}/artifacts`)).json();
const artifact=list.artifacts.find(a=>a.name==='cloudflare-worker'&&!a.expired);
if(!artifact)throw Error('Artefato Cloudflare não encontrado.');
const archive=Buffer.from(await (await get(`${base}/actions/artifacts/${artifact.id}/zip`)).arrayBuffer());
mkdirSync('.cloudflare-artifacts',{recursive:true});
writeFileSync('.cloudflare-artifacts/worker.zip',archive);
if(process.platform==='win32')run('powershell',['-NoProfile','-Command',`$target = Join-Path (Get-Location).Path '.open-next'; if ([IO.Path]::GetFullPath($target) -ne '${root.replace(/'/g,"''")}\\.open-next') { throw 'Destino inválido' }; if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path (Get-Location).Path '.cloudflare-artifacts/worker.zip'),$target)`]);
else {run('mkdir',['-p','.open-next']);run('unzip',['-oq','.cloudflare-artifacts/worker.zip','-d','.open-next']);}
if(existsSync('.env.production.local'))run(process.execPath,['--env-file=.env.production.local','node_modules/drizzle-kit/bin.cjs','migrate']);
const args=['node_modules/wrangler/bin/wrangler.js','deploy','--keep-vars','--message',sha];
if(existsSync('.dev.vars.production'))args.push('--secrets-file','.dev.vars.production');
// This app uses dummy caches and dynamic private routes. No remote cache population is needed.
// Use Wrangler directly to avoid starting a local workerd proxy on Windows.
run(process.execPath,args,{env:{...process.env,OPEN_NEXT_DEPLOY:'true'}});
console.log('Publicado o mesmo commit aprovado pelo CI: '+sha);
