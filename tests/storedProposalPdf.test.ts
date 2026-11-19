import assert from 'node:assert/strict';
import {selectStoredProposalPdf,loadStoredProposalPdf} from '../src/lib/storedProposalPdf';
const p={id:'own-proposal',currentVersion:'v1.1'};
const doc:any={id:'saved',proposal_id:p.id,extension:'pdf',filename:'Proposal_2610-65_v1.1_Firm.pdf',tags:['v1.1'],created_at:'2026-11-03T00:00:00Z',is_deleted:false};
let passed=0;async function test(name:string,fn:()=>any){await fn();passed++;console.log('PASS '+name);}
await test('Select saved current revision',()=>assert.equal(selectStoredProposalPdf([doc],p)?.id,'saved'));
await test('Do not substitute newer old revision',()=>assert.equal(selectStoredProposalPdf([doc,{...doc,id:'old',tags:['v1.0'],filename:'old.pdf',created_at:'2026-11-05T00:00:00Z'}],p)?.id,'saved'));
await test('Pick latest stored copy of same revision',()=>assert.equal(selectStoredProposalPdf([doc,{...doc,id:'latest',created_at:'2026-11-06T00:00:00Z'}],p)?.id,'latest'));
await test('Other proposal cannot be selected',()=>assert.equal(selectStoredProposalPdf([{...doc,proposal_id:'other'}],p),undefined));
await test('Deleted and non-PDF documents excluded',()=>assert.equal(selectStoredProposalPdf([{...doc,is_deleted:true},{...doc,extension:'docx'}],p),undefined));
await test('Legacy filename version works without tags',()=>assert.equal(selectStoredProposalPdf([{...doc,tags:[]}],p)?.id,'saved'));
await test('Version 1.1 cannot match 1.10',()=>assert.equal(selectStoredProposalPdf([{...doc,tags:['v1.10'],filename:'Proposal_2610-65_v1.10_Firm.pdf'}],p),undefined));
await test('Unrelated PDF is never fallback for absent version',()=>assert.equal(selectStoredProposalPdf([doc],{...p,currentVersion:'v2.0'}),undefined));
(globalThis as any).pdfFixture={documents:[doc]};
await test('Read stored file using authenticated document service, no PDF generation',async()=>{const url=await loadStoredProposalPdf(p);assert.equal(url,'https://fixture.example.test/saved.pdf');assert.deepEqual((globalThis as any).pdfFixture.filters,{proposalId:p.id});assert.equal((globalThis as any).pdfFixture.signedId,'saved');});
await test('Missing PDF is an explicit error',async()=>{(globalThis as any).pdfFixture.documents=[];await assert.rejects(()=>loadStoredProposalPdf(p),/kayıtlı teklif PDF/);});
await test('Storage failures propagate to visible error state',async()=>{(globalThis as any).pdfFixture.error=true;await assert.rejects(()=>loadStoredProposalPdf(p),/storage unavailable/);});

const f=(globalThis as any).pdfFixture;
f.error=false;f.documents=[doc,{...doc,id:'newer',created_at:'2026-11-07T00:00:00Z'}];
await test('Permanent wizard ID wins over a newer duplicate PDF',async()=>{const before=f.listCalls;assert.equal(await loadStoredProposalPdf({...p,pdfDocumentLinks:{'v1.1':'saved'}}),'https://fixture.example.test/saved.pdf');assert.equal(f.directId,'saved');assert.equal(f.listCalls,before);});
await test('Broken explicit link never silently chooses another artifact',async()=>{await assert.rejects(()=>loadStoredProposalPdf({...p,pdfDocumentLinks:{'v1.1':'missing'}}),/Linked PDF missing/);});
await test('Explicit link cannot display another proposal file',async()=>{f.documents=[{...doc,proposal_id:'other'}];await assert.rejects(()=>loadStoredProposalPdf({...p,pdfDocumentLinks:{'v1.1':'saved'}}),/bağlantısı geçersiz/);});
const {storeProposalPdf}=await import('../src/lib/proposalService');
const proposal:any={...p,companyName:'Fixture Company',proposalNumber:'2611-70',documentSource:'snapshot-source',pdfDocumentLinks:{'v1.0':'older-file'}};
f.proposals=[proposal];const blob=new Blob(['exact wizard PDF bytes'],{type:'application/pdf'});
await test('Wizard saves exact PDF artifact ID against its revision',async()=>{const linked=await storeProposalPdf(proposal,'TR',blob);assert.equal(f.uploaded.blob,blob);assert.equal(linked.pdfDocumentLinks?.['v1.1'],'wizard-file-id');assert.equal(f.proposals[0].pdfDocumentLinks['v1.1'],'wizard-file-id');assert.equal(f.proposals[0].pdfDocumentLinks['v1.0'],'older-file');});
await test('Upload completed for stale revision cannot overwrite newer content',async()=>{f.proposals=[structuredClone(proposal)];f.duringUpload=()=>{f.proposals[0].currentVersion='v1.2';};await assert.rejects(()=>storeProposalPdf(proposal,'TR',blob),/teklif değişti/);assert.equal(f.proposals[0].currentVersion,'v1.2');assert.equal(f.proposals[0].pdfDocumentLinks['v1.1'],undefined);f.duringUpload=null;});
await test('Failed link save is not reported as saved PDF',async()=>{f.proposals=[structuredClone(proposal)];f.persistError=true;await assert.rejects(()=>storeProposalPdf(proposal,'TR',blob),/save failed/);f.persistError=false;});
const {copyProposalForWizard}=await import('../src/lib/proposalSnapshot');
await test('Duplicated proposal does not inherit source document links',()=>{const source:any={...proposal,date:'2026-11-19',sequenceNo:70};const copy=copyProposalForWizard(source,[source]);assert.equal(copy.pdfDocumentLinks,undefined);assert.equal(source.pdfDocumentLinks['v1.0'],'older-file');});


await test('Explicit document link still validates its revision',async()=>{f.documents=[{...doc,tags:['v1.0'],filename:'old.pdf'}];await assert.rejects(()=>loadStoredProposalPdf({...p,pdfDocumentLinks:{'v1.1':'saved'}}),/bağlantısı geçersiz/);});

console.log(`${passed} saved PDF/link checks passed; no real documents modified.`);
