import assert from 'node:assert/strict';
import {CrmDb} from '../src/lib/CrmDb';
import {persistAuxiliary} from '../src/lib/crmSupabaseService';
const clone=<T,>(v:T):T=>structuredClone(v);
const delay=(ms=0)=>new Promise(r=>setTimeout(r,ms));
let tick=0,failWrites=false,casFailures=0,writeLag=0,readLag=0;
let tables:Record<string,any[]>={};
const org='test-org';
const aux=()=>tables.companies.find(r=>r.id==='__org_auxiliary__').data;
class Query {
 filters:((r:any)=>boolean)[]=[]; op='select'; payload:any; single=false;
 constructor(public table:string){}
 select(...args:any[]){return this;} eq(key:string,val:any){this.filters.push(r=>r[key]===val);return this;}
 gt(key:string,val:any){this.filters.push(r=>r[key]>val);return this;}
 in(key:string,vals:any[]){this.filters.push(r=>vals.includes(r[key]));return this;}
 update(value:any){this.op='update';this.payload=value;return this;}
 upsert(value:any,...args:any[]){this.op='upsert';this.payload=value;return this;}
 delete(){this.op='delete';return this;}maybeSingle(){this.single=true;return this;}
 then(resolve:any,reject:any){return this.run().then(resolve,reject);}
 async run(){
  if(this.op!=='select'){
   if(writeLag)await delay(writeLag);
   if(failWrites)return {data:null,error:{message:'TEST: network unavailable'}};
  }
  const selected=(tables[this.table]||[]).filter(r=>this.filters.every(f=>f(r)));
  if(this.op==='update'){
   if(casFailures>0){casFailures--;return {data:[],error:null};}
   for(const r of selected)Object.assign(r,clone(this.payload),{updated_at:new Date(1767225600000+(++tick)*1000).toISOString()});
  } else if(this.op==='upsert'){
   for(const incoming of this.payload){let row=tables[this.table].find(r=>r.id===incoming.id);if(!row){row={};tables[this.table].push(row);}Object.assign(row,clone(incoming),{updated_at:new Date(1767225600000+(++tick)*1000).toISOString()});}
   return {data:clone(tables[this.table].filter(r=>this.payload.some((p:any)=>p.id===r.id))),error:null};
  } else if(this.op==='delete')tables[this.table]=tables[this.table].filter(r=>!selected.includes(r));
  const data=clone(selected);if(this.op==='select'&&readLag)await delay(readLag);return {data:this.single?(data[0]||null):data,error:null};
 }
}
(globalThis as any).crmTestClient={from:(table:string)=>new Query(table),auth:{getUser:async()=>({data:{user:{id:'test-user'}}})}};
async function reset(){
 tick=0;readLag=0;writeLag=0;casFailures=0;failWrites=false;
 tables={companies:[{id:'__org_auxiliary__',organization_id:org,updated_at:'2026-01-01T00:00:00.000Z',data:{pipelineStages:['Solution Design'],stageMetadata:{'Solution Design':{collapsed:false,description:'Saved description'}},kvStore:{},emails:[],projects:[],activities:[],crmDocuments:[],taskColumns:[],crmUsers:[],notificationSettings:null,taskNotifications:[],leadSources:null,companyCustomFieldDefs:null}}],contacts:[],proposals:[],tasks:[],deals:[{id:'d1',organization_id:org,updated_at:'2026-01-01T00:00:00.000Z',data:{id:'d1',companyName:'Test',stage:'Solution Design',description:'original'}}]};
 CrmDb.resetCache();await CrmDb.hydrateFromSupabase(org);
}
let passed=0;
function ok(name:string){passed++;console.log('ok - '+name);}
async function main(){
 await reset();writeLag=30;
 CrmDb.savePipelineStages(['Değerlendirme Aşaması']);
 CrmDb.saveStageMetadata({'Değerlendirme Aşaması':{collapsed:false,description:'Saved description'}});
 await CrmDb.hydrateFromSupabase(org,{force:true});
 CrmDb.setKv('unrelated-setting','changed');await CrmDb.flushPendingWrites();
 assert.deepEqual(aux().pipelineStages,['Değerlendirme Aşaması']);assert.deepEqual(CrmDb.getPipelineStages(),['Değerlendirme Aşaması']);
 assert.ok(aux().stageMetadata['Değerlendirme Aşaması']);ok('Slow writes + refresh + unrelated KV save preserve renamed stage and metadata');
 await reset();const stale=clone(aux());writeLag=20;
 const first=persistAuxiliary({...stale,pipelineStages:['New stage']},[],['pipelineStages']);
 const second=persistAuxiliary({...stale,kvStore:{other:1}},['other']);
 await Promise.all([first,second]);assert.deepEqual(aux().pipelineStages,['New stage']);assert.equal(aux().kvStore.other,1);ok('Queued stale auxiliary snapshot cannot roll back a newer stage');
 await reset();writeLag=20;
 let deals=CrmDb.getDeals();CrmDb.saveDeals(deals.map(d=>({...d,description:'edited'})));await delay(5);
 CrmDb.saveDeals(deals.map(d=>({...d,description:'original'})));await CrmDb.flushPendingWrites();
 await CrmDb.hydrateFromSupabase(org,{force:true});assert.equal(CrmDb.getDeals()[0].description,'original');ok('Rapid edit and undo retain the final intended value');
 await reset();const deals2=CrmDb.getDeals().map(d=>({...d,stage:'Değerlendirme Aşaması'}));
 await CrmDb.savePipelineConfiguration(['Değerlendirme Aşaması'],{'Değerlendirme Aşaması':{collapsed:true,description:'Custom description'}},deals2);
 await CrmDb.hydrateFromSupabase(org,{force:true});
 assert.deepEqual(CrmDb.getPipelineStages(),['Değerlendirme Aşaması']);assert.equal(CrmDb.getDeals()[0].stage,'Değerlendirme Aşaması');assert.equal((CrmDb.getStageMetadata() as any)['Değerlendirme Aşaması'].description,'Custom description');ok('Configuration save survives a fresh database load with matching deals and description');
 await reset();failWrites=true;CrmDb.setKv('important','saved value');
 await assert.rejects(CrmDb.flushPendingWrites(),/network unavailable/);assert.ok(CrmDb.getSyncStatus().error);assert.equal(CrmDb.getKv('important',''),'saved value');
 failWrites=false;await CrmDb.retryFailedWrites();assert.equal(aux().kvStore.important,'saved value');assert.equal(CrmDb.getSyncStatus().error,null);ok('Failed writes remain visible and retry preserves the unsaved change');
 await reset();readLag=20;
 const refresh=CrmDb.hydrateFromSupabase(org,{force:true});await delay(5);
 CrmDb.savePipelineStages(['Edited during refresh']);await refresh;await CrmDb.flushPendingWrites();
 assert.deepEqual(CrmDb.getPipelineStages(),['Edited during refresh']);assert.deepEqual(aux().pipelineStages,['Edited during refresh']);ok('A snapshot started before a local edit cannot replace that edit');
 await reset();failWrites=true;
 CrmDb.saveDeals(CrmDb.getDeals().map(d=>({...d,description:'unsaved edit'})));
 await assert.rejects(CrmDb.flushPendingWrites());await assert.rejects(CrmDb.hydrateFromSupabase(org,{force:true}));
 assert.equal(CrmDb.getDeals()[0].description,'unsaved edit');failWrites=false;await CrmDb.retryFailedWrites();
 await CrmDb.hydrateFromSupabase(org,{force:true});assert.equal(CrmDb.getDeals()[0].description,'unsaved edit');ok('A failed row save is protected from refresh and can be retried');
 await reset();const saved=clone(aux());casFailures=4;
 await assert.rejects(persistAuxiliary({...saved,pipelineStages:['Unsafe']},[],['pipelineStages']),/çakıştı/);assert.deepEqual(aux().pipelineStages,['Solution Design']);ok('Repeated conflicts never bypass compare-and-swap');
 console.log(`${passed} persistence integration tests passed using real CrmDb and service with an isolated fake transport.`);
}
main().catch(err=>{console.error(err);process.exitCode=1;});
