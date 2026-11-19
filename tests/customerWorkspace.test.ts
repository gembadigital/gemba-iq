import assert from 'node:assert/strict';
import {canUseCompanyDiscovery,newCustomerDraft} from '../src/lib/customerWorkspace';
import {relatedDealProposals} from '../src/lib/dealProposalLinks';
let passed=0;function test(name:string,fn:()=>void){fn();passed++;console.log('PASS '+name);}
test('Germany company discovery disabled by organization slug',()=>assert.equal(canUseCompanyDiscovery({slug:'gembapartner-de',country:null}),false));
test('Germany company discovery disabled by country',()=>assert.equal(canUseCompanyDiscovery({slug:'other',country:'Germany'}),false));
test('Turkey company discovery preserved',()=>assert.equal(canUseCompanyDiscovery({slug:'gemba-partner',country:'Türkiye'}),true));
test('Blank full-card draft has no placeholder company or fake production values',()=>{const d=newCustomerDraft('Actual Actor','Germany');assert.equal(d.name,'');assert.equal(d.industry,'');assert.equal(d.accountOwner,'Actual Actor');assert.equal(d.billingCountry,'Germany');assert.equal(d.annualRevenueCurrency,'€');assert.notEqual(d.id,newCustomerDraft('Actual Actor').id);});
const deal={id:'d1',companyId:'c1',proposalNumber:'2611-70'};
const p:any={id:'p1',companyId:'c1',proposalNumber:'2611-70',date:'2026-11-19',currentVersion:'v1.1'};
test('Canonical proposal record is selected using stable opportunity ID',()=>assert.equal(relatedDealProposals([{...p,dealId:'d1'}],deal)[0].id,'p1'));
test('Legacy proposal reference works when deal ID has not been populated',()=>assert.equal(relatedDealProposals([p],deal)[0].id,'p1'));
test('Another opportunity at same customer is excluded',()=>assert.equal(relatedDealProposals([{...p,dealId:'d2'}],deal).length,0));
test('Other customers with same reference are excluded',()=>assert.equal(relatedDealProposals([{...p,companyId:'c2'}],deal).length,0));
test('Other offers for same customer are not guessed as linked',()=>assert.equal(relatedDealProposals([{...p,proposalNumber:'2611-71'}],deal).length,0));
test('Deleted offers are hidden except explicit recovery list',()=>{assert.equal(relatedDealProposals([{...p,isDeleted:true}],deal).length,0);assert.equal(relatedDealProposals([{...p,isDeleted:true}],deal,true).length,1);});
test('Current referenced offer sorts before other explicitly linked offers',()=>assert.equal(relatedDealProposals([{...p,id:'p2',proposalNumber:'2611-71',dealId:'d1',date:'2027-01-01'},p],deal)[0].id,'p1'));
console.log(`${passed} customer workspace and proposal-link checks passed.`);
