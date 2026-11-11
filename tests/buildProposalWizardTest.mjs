import fs from 'node:fs/promises';import{createRequire}from'node:module';
import path from 'node:path';import{fileURLToPath}from'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(process.argv[2]||'/tmp/gemba-proposal-browser-test');await fs.mkdir(out,{recursive:true});
const require=createRequire(base+'/package.json');const{build}=require('esbuild');
const service=await fs.readFile(base+'/src/lib/proposalService.ts','utf8');
const names=[...service.matchAll(/export (?:async )?function (\w+)/g)].map(x=>x[1]);
const mocks={
 CrmDb:`export const CrmDb=new Proxy({getKv:(k,f)=>window.testDb.kv[k]??f,setKv:(k,v)=>{window.testDb.kv[k]=v},getProposals:()=>structuredClone(window.testDb.proposals),saveProposals:p=>{window.testDb.proposals=structuredClone(p)},saveProposalsConfirmed:async p=>{if(window.testDb.fail)throw Error('TEST: kayıt başarısız');window.testDb.proposals=structuredClone(p);},getCompanies:()=>[{id:'customer',name:'Test Müşteri'}],getPrimaryContact:()=>({firstName:'Müşteri',lastName:'Yetkilisi'}),createCompany:()=>({id:'customer'}),getDeals:()=>window.testDb.deals,saveDeals:p=>{window.testDb.deals=p}},{get:(t,k)=>t[k]||(()=>[])});`,
 OrganizationContext:`export const useOrganization=()=>({actorName:'İç Temsilci',actorEmail:'internal@example.test',organizationId:'test',isAdmin:true});`,
 supabaseClient:`export const getSupabase=()=>null;export const isSupabaseConfigured=()=>false;`,
 organizationMailbox:`export const fetchOrganizationMailbox=async()=>null;`,personalMailbox:`export const fetchPersonalMailbox=async()=>null;`,
 useProposalPdfCapture:`export const useProposalPdfCapture=()=>({capture:async p=>({blob:new Blob(['%PDF-test'])}),captureNode:null});`,
 proposalService:names.map(n=>`export const ${n}=async(...args)=>${n==='storeProposalPdf'?'(window.testDb.pdfs.push(structuredClone(args[0])),undefined)':'[]'};`).join('\n')
};
await build({entryPoints:[base+'/tests/proposalWizard.browser.tsx'],outfile:out+'/test.js',bundle:true,nodePaths:[base+'/node_modules'],platform:'browser',jsx:'automatic',define:{'import.meta.env':'{}'},plugins:[{name:'offline-only',setup(b){b.onResolve({filter:/\/(CrmDb|OrganizationContext|supabaseClient|organizationMailbox|personalMailbox|useProposalPdfCapture|proposalService)$/},args=>({path:args.path.split('/').pop(),namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:mocks[args.path]}));}}]});
await fs.writeFile(out+'/index.html',`<!doctype html><html lang="tr" class="saas-layout gemba-stitch-skin"><head><meta charset="utf-8"></head><body><h1 id="status">Test hazırlanıyor</h1><pre id="results"></pre><main style="padding:20px"><div id="root"></div></main><script src="test.js"></script></body></html>`);
console.log('Offline proposal regression harness built.');
