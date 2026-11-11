import assert from 'node:assert/strict';
import { copyProposalForWizard, nextProposalVersion, proposalContentKey, proposalOptionRows } from '../src/lib/proposalSnapshot';
import type { Proposal } from '../src/types/proposal';
const source = { id:'source', sequenceNo:70, proposalNumber:'2611-70', companyId:'customer', companyName:'Test müşteri',
 date:'2026-11-10', currentVersion:'v1.9', status:'Accepted', approvalStatus:'Approved', dealId:'opportunity',
 contactPerson:'Yetkili', currency:'₺', coverPage:'Müşteriye özel kapak', activityTableHtml:'<table>Özel adımlar</table>', terms:'Özel koşullar',
 options:{'Option 1':{ name:'Özel program',desc:'',duration:'12 ay',dailyRate:32500,manDays:4,rows:[{id:'r',item:'Faz 1',dailyRate:32500,manDays:4}]}},
 versions:[{version:'v1.9'}], auditLog:[{id:'audit'}], timelineEvents:[{id:'event'}] } as unknown as Proposal;
const before=JSON.stringify(source);
const copy=copyProposalForWizard(source,[source,{proposalNumber:'2611-88',sequenceNo:71} as Proposal],new Date(2026,10,11));
assert.equal(copy.id,''); assert.equal(copy.proposalNumber,'2611-89'); assert.equal(copy.companyId,source.companyId);
assert.deepEqual(copy.options,source.options);assert.equal(copy.coverPage,source.coverPage);assert.equal(copy.terms,source.terms);
assert.equal(copy.currentVersion,'v1.0');assert.deepEqual(copy.versions,[]);assert.equal(copy.dealId,undefined);assert.equal(copy.auditLog,undefined);
copy.options['Option 1'].rows![0].dailyRate=1;assert.equal(JSON.stringify(source),before);
assert.equal(nextProposalVersion(),'v1.0');assert.equal(nextProposalVersion('v1.9'),'v1.10');assert.equal(nextProposalVersion('v1.10'),'v1.11');
const key=proposalContentKey(source);assert.equal(proposalContentKey(structuredClone(source)),key);
const changed=structuredClone(source);changed.options['Option 1'].rows![0].dailyRate=40000;assert.notEqual(proposalContentKey(changed),key);
const summary=structuredClone(source);summary.options['Option 1'].dailyRate=1;summary.options['Option 1'].rows![0].id='newid';assert.equal(proposalContentKey(summary),key);
assert.deepEqual(proposalOptionRows({...source.options['Option 1'],rows:[]}),[]);
assert.equal(proposalOptionRows({...source.options['Option 1'],rows:undefined})[0].dailyRate,32500);
assert.deepEqual(proposalOptionRows(),[]);
const rendered=structuredClone(source);
rendered.documentHtml='<div>2611-70 / 10.11.2026 / Özel metin</div>';
rendered.documentSource=proposalContentKey(rendered);
const renderedCopy=copyProposalForWizard(rendered,[source],new Date(2026,10,11));
assert.ok(renderedCopy.documentHtml?.includes('2611-71 / 11.11.2026 / Özel metin'));
assert.equal(renderedCopy.documentSource,proposalContentKey(renderedCopy));
console.log('Proposal snapshot: copies, version increments, content signatures and legacy pricing passed.');
