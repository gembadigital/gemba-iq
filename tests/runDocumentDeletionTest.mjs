import {build} from 'esbuild';import {spawnSync} from 'node:child_process';
const outfile='/tmp/gemba-document-deletion-test.mjs';
await build({entryPoints:['tests/documentDeletion.test.ts'],bundle:true,platform:'node',format:'esm',outfile,plugins:[{name:'document-fixtures',setup(b){
 b.onResolve({filter:/\/organizationMailbox\.js$/},()=>({path:'auth',namespace:'fixture'}));
 b.onResolve({filter:/\/(organizationFetch|OrganizationContext|supabaseClient)$/},a=>({path:a.path.split('/').pop(),namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='auth'?`export async function getRequestContext(req){return globalThis.documentFixture.context(req);}`:a.path==='organizationFetch'?`export async function organizationFetch(url,init){return globalThis.documentFixture.fetch(url,init);}`:a.path==='OrganizationContext'?`export function getActiveOrganizationId(){return '11111111-1111-4111-8111-111111111111';}`:`export function getSupabase(){throw Error('Direct table/Storage access not allowed in delete test');}`}));
}}]});const r=spawnSync(process.execPath,[outfile],{stdio:'inherit'});process.exitCode=r.status||0;
