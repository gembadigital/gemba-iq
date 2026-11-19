import {build} from 'esbuild';import {spawnSync} from 'node:child_process';
const outfile='/tmp/gemba-personal-provider-test.mjs';
await build({entryPoints:['tests/personalProvider.test.ts'],bundle:true,platform:'node',format:'esm',outfile,plugins:[{name:'isolated-providers',setup(b){
 b.onResolve({filter:/\/organizationMailbox\.js$/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/^@google\/genai$/},()=>({path:'google',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='auth'?`export async function getRequestContext(req){if(req.denied)throw Object.assign(Error('Unauthorized'),{status:401});return globalThis.providerFixture.context(req.owner||'a');}`:`export class GoogleGenAI{constructor(options){globalThis.providerFixture.sdkKeys.push(options.apiKey);this.models={generateContent:async()=>{await new Promise(r=>setTimeout(r,5));if(globalThis.providerFixture.sdkError)throw Object.assign(Error('upstream echoed '+options.apiKey),{status:400});return {text:JSON.stringify({subject:'Synthetic',body:'Synthetic'})};}};}}`}));
}}]});const r=spawnSync(process.execPath,[outfile],{stdio:'inherit'});process.exitCode=r.status||0;
