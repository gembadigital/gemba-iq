import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(process.argv[2]||'/tmp/gemba-workspace-preview');await fs.mkdir(out,{recursive:true});
const require=createRequire(base+'/package.json');const{build}=require('esbuild');
const functions=async file=>[...(await fs.readFile(base+'/src/lib/'+file+'.ts','utf8')).matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
const apiNames=await functions('proposalService');
const db=`const data=new Proxy({},{get:(_,k)=>window.workspaceFixture[k],set:(_,k,v)=>{window.workspaceFixture[k]=v;return true}});export const normalizeTrKey=s=>s;export const deduplicateTargetAccounts=s=>s;export const CrmDb=new Proxy({getKv:(k,f)=>data.kv[k]??f,setKv:(k,v)=>{data.kv[k]=v},getProposals:()=>structuredClone(data.proposals),saveProposals:p=>{data.proposals=structuredClone(p)},getCompanies:()=>data.companies,getCompanyById:id=>data.companies.find(c=>c.id===id),saveCompanies:()=>{},getDeals:()=>[],getPrimaryContact:()=>({firstName:"Müşteri",lastName:"Yetkilisi",email:"customer@example.test"}),getContactsByCompany:()=>[],hydrateFromSupabase:async()=>{},getSyncStatus:()=>({pending:0,error:null})},{get:(t,k)=>t[k]||(()=>[])});`;
const mocks={CrmDb:db,OrganizationContext:`const org={actorName:'Örnek Kullanıcı',actorEmail:'',companyName:'Gemba Partner',isAdmin:true,organization:{id:'demo',name:'Gemba Partner'}};export const getActiveOrganizationId=()=>null;export const useOrganization=()=>org;export const OrganizationProvider=({children})=>children;`,AuthContext:`export const useAuth=()=>({signOut:()=>{},user:{id:'demo'},session:null});export const AuthProvider=({children})=>children;`,supabaseClient:`export const getSupabase=()=>null;export const isSupabaseConfigured=()=>false;`,organizationMailbox:`export const fetchOrganizationMailbox=async()=>null;`,personalMailbox:`export const fetchPersonalMailbox=async()=>null;`,useOrganizationMailboxController:`const noop=()=>{};const controller={session:null,organizationMailbox:null,microsoftConfig:{},onConnectOrganizationMailbox:noop,onDisconnectOrganizationMailbox:noop,onTestOrganizationMailbox:noop};export const useOrganizationMailboxController=()=>controller;`,proposalService:apiNames.map(n=>n==='mapStatusToApproval'?`export const mapStatusToApproval=s=>s==='Accepted'?'Approved':s==='Rejected'?'Rejected':s==='Draft'?'Draft':'Sent';`:`export const ${n}=async(...args)=>${n==='loadProposalEnterpriseMeta'?'({timeline:[],auditLog:[]})':n==='updateEnterpriseProposal'||n==='createEnterpriseProposal'?'(window.workspaceFixture.saved=args[0],args[0])':'[]'};`).join('\n')};
for(const file of ['notificationMailer','dealReminderEngine','personalMailbox','organizationMailbox']){
 const names=await functions(file);mocks[file]=names.map(n=>`export const ${n}=${n==='isClientScanEnabled'?'()=>false':n==='scanDealStageReminders'?'async()=>({created:[]})':n==='detectMailSenderSource'||/Mailbox/.test(n)?'async()=>null':'async()=>[]'};`).join('\n');
}
await build({entryPoints:[base+'/tests/workspaceLayout.browser.tsx'],outfile:out+'/preview.js',bundle:true,platform:'browser',jsx:'automatic',nodePaths:[base+'/node_modules'],define:{'import.meta.env':'{}'},loader:{'.css':'empty'},plugins:[{name:'offline-preview',setup(b){
 b.onLoad({filter:/\/App\.tsx$/},async args=>({loader:'tsx',resolveDir:base+'/src',contents:(await fs.readFile(args.path,'utf8')).replace('useState<ActiveTab>(getInitialActiveTab)',`useState<ActiveTab>('proposal-management')`).replaceAll('/logos/','./logos/').replace('https://lh3.googleusercontent.com/d/13bNnthJU4LIICB4iiF1a4GH1PEn05MBx','./logos/Giqlogo.png')}));
 b.onResolve({filter:/\/(CrmDb|OrganizationContext|AuthContext|supabaseClient|organizationMailbox|personalMailbox|useOrganizationMailboxController|proposalService|notificationMailer|dealReminderEngine)$/},args=>({path:args.path.split('/').pop(),namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},args=>({contents:mocks[args.path]}));
}}]});
const assets=process.argv[3];
if(assets){
 const entries=await fs.readdir(assets);
 for(const [prefix,name]of[['index-','base.css'],['App-','theme.css']]){
  const css=entries.find(f=>f.startsWith(prefix)&&f.endsWith('.css'));
  if(!css)throw Error('Build CSS missing: '+prefix);await fs.copyFile(path.join(assets,css),out+'/'+name);
 }
}else{
 for(const name of ['base.css','theme.css'])await fs.copyFile(path.resolve(base,'../catalog-work/crm-refresh',name),out+'/'+name);
}
await fs.copyFile(base+'/src/styles/workspace-layout.css',out+'/layout.css');
await fs.cp(base+'/public/logos',out+'/logos',{recursive:true});
await fs.writeFile(out+'/index.html',`<!doctype html><html lang="tr" class="saas-layout gemba-stitch-skin"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gemba IQ · Menü ve Teklif Düzeni</title><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="layout.css"></head><body style="margin:0"><div id="root"></div><script src="preview.js"></script></body></html>`);
await fs.writeFile(out+'/mobile.html',`<!doctype html><html><meta charset="utf-8"><body style="margin:0"><iframe title="390px mobil" src="index.html?mobile" style="width:390px;height:760px;border:0"></iframe></body></html>`);
console.log('Offline App and proposal editor preview ready. Add ?test to run layout and form checks.');
