import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const manifest=JSON.parse(fs.readFileSync('public/manifest.json','utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');
for(const icon of manifest.icons){const png=fs.readFileSync('public'+icon.src);assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(icon.sizes,`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);}
const apple=fs.readFileSync('public/icons/apple-touch-icon-180.png');assert.equal(apple.readUInt32BE(16),180);assert.equal(apple.readUInt32BE(20),180);
const listeners={},removed=[],cacheReads=[],network=[];let failNetwork=false;
const offline=new Response('offline notice',{headers:{'Content-Type':'text/html'}});
const cache={addAll:async paths=>assert(paths.every(p=>p.startsWith('/icons/')||p==='/offline.html')),match:async request=>{const key=typeof request==='string'?request:new URL(request.url).pathname;cacheReads.push(key);return key==='/offline.html'?offline:undefined;}};
const context={URL,Promise,self:{location:{origin:'https://gemba-iq.vercel.app'},addEventListener:(event,fn)=>listeners[event]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>cache,keys:async()=>['smart-mail-merge-cache-v3','gemba-iq-static-v3','gemba-iq-static-v4','other-module-cache'],delete:async key=>removed.push(key)},fetch:async request=>{network.push(request.url);if(failNetwork)throw Error('offline');return new Response('online');}};
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),context);
let work;listeners.install({waitUntil:p=>work=p});await work;listeners.activate({waitUntil:p=>work=p});await work;
assert.deepEqual(removed,['smart-mail-merge-cache-v3','gemba-iq-static-v3']);
function request(path,mode='cors',method='GET'){let response;listeners.fetch({request:{url:'https://gemba-iq.vercel.app'+path,mode,method},respondWith:p=>response=p});return response;}
for(const path of ['/api/organization/members','/api/mail/scan','/auth/callback','/assets/App-current.js','/manifest.json'])assert.equal(request(path),undefined,`${path} should use normal network handling`);
assert.equal(request('/api/mail/send','cors','POST'),undefined);
assert.equal(await(await request('/','navigate')).text(),'online');failNetwork=true;
assert.equal(await(await request('/','navigate')).text(),'offline notice');
assert.equal(request('/assets/App-current.js'),undefined,'JS assets must never receive offline HTML');
assert(cacheReads.every(p=>p==='/offline.html'));console.log('PASS: install metadata, real icon sizes, public-only cache, legacy cache migration and navigation fallback.');
