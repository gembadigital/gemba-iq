import assert from 'node:assert/strict';
import { deleteDocumentHandler } from '../lib/server/documentActions.js';
import { resolveOrganizationAccess } from '../lib/server/organizationAccess.js';
import { deleteDocument } from '../src/lib/enterpriseDocumentService';
const tr='11111111-1111-4111-8111-111111111111',de='22222222-2222-4222-8222-222222222222';
const tid='33333333-3333-4333-8333-333333333333',did='44444444-4444-4444-8444-444444444444';
let rows:any[],dbError=false,body:any,clientStatus=200,clientResult:any={success:true},writes=0,passed=0;
const members=[{user_id:'tr-user',organization_id:tr,role:'USER'},{user_id:'de-user',organization_id:de,role:'ADMIN'},{user_id:'super',organization_id:tr,role:'ADMIN'},{user_id:'super',organization_id:de,role:'ADMIN'}];
const client={from(table:string){let filters:any[]=[],updates:any;const q:any={select:()=>q,eq:(k:string,v:any)=>{filters.push([k,v]);return q;},update:(v:any)=>{updates=v;return q;},then:(fn:any)=>Promise.resolve({data:members.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null}).then(fn),maybeSingle:async()=>{assert.equal(table,'documents');assert.deepEqual(updates,{is_deleted:true});assert.ok(filters.some(([k])=>k==='organization_id'));assert.ok(filters.some(([k,v])=>k==='is_deleted'&&v===false));if(dbError)return {error:{message:'secret db detail'}};const row=rows.find(r=>filters.every(([k,v])=>r[k]===v));if(row){row.is_deleted=true;writes++;}return {data:row?{id:row.id}:null,error:null};}};return q;}};
(globalThis as any).documentFixture={async context(req:any){const actor=req.headers?.authorization?.replace('Bearer ','');if(!['tr-user','de-user','super'].includes(actor))throw Object.assign(Error(),{status:401});return {adminClient:client,user:{id:actor},...await resolveOrganizationAccess(client,{id:actor},req)};},fetch:async(_url:any,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify(clientResult),{status:clientStatus});}};
function reset(){rows=[{id:tid,organization_id:tr,is_deleted:false,filename:'unchanged.pdf'},{id:did,organization_id:de,is_deleted:false}];dbError=false;writes=0;}
async function call(actor='tr-user',org:any=tr,payload:any={documentId:tid},method='POST'){const out:any={headers:{},setHeader(k:string,v:string){this.headers[k]=v;},status(s:number){this.code=s;return this;},json(v:any){this.body=v;return this;}};await deleteDocumentHandler({method,headers:{authorization:'Bearer '+actor,...(org===null?{}:{'x-organization-id':org})},body:payload},out);return out;}
async function test(name:string,fn:()=>any){reset();await fn();passed++;console.log('PASS '+name);}
await test('Anonymous denied without changing rows',async()=>{assert.equal((await call('invalid')).code,401);assert.equal(writes,0);});
await test('Wrong method denied',async()=>assert.equal((await call('tr-user',tr,{},'GET')).code,405));
await test('Malformed ID rejected',async()=>{assert.equal((await call('tr-user',tr,{documentId:'bad'})).code,400);assert.equal(writes,0);});
await test('Malformed organization rejected',async()=>assert.equal((await call('tr-user','bad')).code,400));
await test('Forged active organization denied',async()=>{assert.equal((await call('tr-user',de,{documentId:did})).code,403);assert.equal(writes,0);});
await test('Other organization document denied',async()=>{assert.equal((await call('tr-user',tr,{documentId:did})).code,404);assert.equal(writes,0);});
await test('Ordinary member can soft delete own workspace record',async()=>{assert.equal((await call()).code,200);assert.equal(rows[0].is_deleted,true);assert.equal(rows[0].filename,'unchanged.pdf');assert.equal(rows.length,2);assert.equal(rows[1].is_deleted,false);});
await test('Body cannot override verified identity, organization or mutation',async()=>{assert.equal((await call('tr-user',tr,{documentId:tid,organizationId:de,userId:'de-user',is_deleted:false,filename:'changed'})).code,200);assert.equal(rows[0].is_deleted,true);assert.equal(rows[0].filename,'unchanged.pdf');});
await test('Already deleted is not reported as successful write',async()=>{rows[0].is_deleted=true;assert.equal((await call()).code,404);assert.equal(writes,0);});
await test('Missing row is not reported as success',async()=>{rows=[];assert.equal((await call()).code,404);});
await test('Superadmin must select organization when multiple memberships exist',async()=>assert.equal((await call('super',null)).code,409));
await test('Superadmin cannot delete other selected-workspace records',async()=>assert.equal((await call('super',de,{documentId:tid})).code,404));
await test('Germany own records work without Microsoft or Gemini setup',async()=>assert.equal((await call('de-user',de,{documentId:did})).code,200));
await test('Database error preserves record and does not leak internals',async()=>{dbError=true;const r=await call();assert.equal(r.code,503);assert.ok(!JSON.stringify(r.body).includes('secret db detail'));assert.equal(writes,0);});
await test('Browser sends only document ID through authenticated organization transport',async()=>{await deleteDocument(tid);assert.deepEqual(body,{documentId:tid});});
await test('Browser propagates a failed save instead of claiming success',async()=>{clientStatus=503;clientResult={error:'Belge silinemedi'};await assert.rejects(()=>deleteDocument(tid),/Belge silinemedi/);});
console.log(`${passed} document deletion checks passed. Synthetic records only.`);
