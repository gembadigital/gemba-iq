import {build} from 'esbuild';import {spawnSync} from 'node:child_process';
const mocks={
 enterpriseDocumentService:`export async function listDocuments(filters){globalThis.pdfFixture.filters=filters;globalThis.pdfFixture.listCalls=(globalThis.pdfFixture.listCalls||0)+1;if(globalThis.pdfFixture.error)throw Error('storage unavailable');return globalThis.pdfFixture.documents;}
 export async function getDocumentById(id){globalThis.pdfFixture.directId=id;const doc=globalThis.pdfFixture.documents.find(d=>d.id===id);if(!doc)throw Error('Linked PDF missing');return doc;}
 export async function getSignedDownloadUrl(doc){globalThis.pdfFixture.signedId=doc.id;return 'https://fixture.example.test/'+doc.id+'.pdf';}
 export async function uploadBlobDocument(input){globalThis.pdfFixture.uploaded=input;if(globalThis.pdfFixture.duringUpload)globalThis.pdfFixture.duringUpload();return {id:'wizard-file-id'};}`,
 CrmDb:`export const CrmDb={getProposals:()=>structuredClone(globalThis.pdfFixture.proposals),saveProposalsConfirmed:async p=>{if(globalThis.pdfFixture.persistError)throw Error('save failed');globalThis.pdfFixture.proposals=structuredClone(p);}};`,
 crmSupabaseService:`export async function persistProposals(){throw Error('Unexpected legacy save');}`,
 supabaseClient:`export function getSupabase(){return {auth:{getUser:async()=>({data:{user:{id:'actor'}}})},from:()=>({insert:async()=>({error:null})})};}`,
 tenantStorage:`export const getActiveOrganizationId=()=> 'org';export const getTenantActorName=()=> 'actor';`,
 organizationFetch:`export const organizationFetch=()=>{throw Error('Unexpected network')};`
};
await build({entryPoints:['tests/storedProposalPdf.test.ts'],bundle:true,platform:'node',format:'esm',outfile:'/tmp/gemba-stored-pdf-test.mjs',plugins:[{name:'stored-pdf-fixture',setup(b){b.onResolve({filter:/\/(enterpriseDocumentService|CrmDb|crmSupabaseService|supabaseClient|tenantStorage|organizationFetch)$/},a=>({path:a.path.split('/').pop(),namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path]}));}}]});const r=spawnSync(process.execPath,['/tmp/gemba-stored-pdf-test.mjs'],{stdio:'inherit'});process.exitCode=r.status||0;
