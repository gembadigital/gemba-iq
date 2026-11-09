import test from 'node:test';
import assert from 'node:assert/strict';
import { findAcceptedRevenueProposals, normalizeRevenueCompany } from '../src/lib/revenueProposalMatch';
import type { Proposal } from '../src/types/proposal';
import type { Invoice } from '../src/data/revenueData';
const proposal=(companyName:string,status='Accepted',isDeleted=false)=>({id:companyName,companyName,status,isDeleted} as Proposal);
test('Turkish uppercase, accents and punctuation resolve to the same company',()=>{
 assert.equal(normalizeRevenueCompany('PİMSA OTOMOTİV A.Ş.'),normalizeRevenueCompany('Pimsa Otomotiv A.Ş'));
 assert.equal(findAcceptedRevenueProposals('PİMSA OTOMOTİV A.Ş.',[],[proposal('Pimsa Otomotiv A.Ş')]).length,1);
});
test('explicit short alias matches Makine legal name to Makina CRM name',()=>{
 const legal='TUNCER MAKİNE SANAYİ VE TİCARET ANONİM ŞİRKETİ';
 const invoices=[{customerName:legal,customerShortName:'TUNCER MAKINA'} as Invoice];
 assert.equal(findAcceptedRevenueProposals(legal,invoices,[proposal('Tuncer Makina')]).length,1);
});
test('does not match fragments, another customer alias, unaccepted or deleted proposals',()=>{
 const invoices=[{customerName:'Başka Firma',customerShortName:'VOLT'} as Invoice];
 assert.deepEqual(findAcceptedRevenueProposals('VOLTEK TEKNOLOJİ',invoices,[proposal('VOLT'),proposal('VOLTEK TEKNOLOJİ','Draft'),proposal('VOLTEK TEKNOLOJİ','Accepted',true)]),[]);
 assert.deepEqual(findAcceptedRevenueProposals('',[],[proposal('Firma')]),[]);
});

test('historical billing is not attributed to a later accepted proposal',()=>{
 const p={...proposal('Örnek Sanayi'),date:'2026-09-28'};
 assert.equal(findAcceptedRevenueProposals('ÖRNEK SANAYİ',[],[p],'2026-04-07').length,0);
 assert.equal(findAcceptedRevenueProposals('ÖRNEK SANAYİ',[],[p],'2026-10-23').length,1);
});

test('invoice service description selects the named service among two accepted offers',()=>{
 const offers=[{...proposal('Örnek Firma'),services:['İç Lojistik Eğitimi','İç Lojistik Eğitmi - Workshop']},{...proposal('Örnek Firma'),services:['SPC Eğitimi','SPC Uygulama Eğitimi']}];
 const matched=findAcceptedRevenueProposals('Örnek Firma',[],offers,undefined,['GG-770.03.042 İÇ LOJİSTİK VE MALZEME HAREKETLERİ']);
 assert.deepEqual(matched,[offers[0]]);
 assert.equal(findAcceptedRevenueProposals('Örnek Firma',[],offers,undefined,['EĞİTİM HİZMET BEDELİ']).length,2);
});
