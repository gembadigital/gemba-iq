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
console.log(`${passed} stored PDF checks passed; no real documents modified.`);
