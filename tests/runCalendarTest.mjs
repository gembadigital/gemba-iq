import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const outfile = path.join(os.tmpdir(), 'gemba-calendar-test.mjs');
await build({ entryPoints: ['tests/calendar.test.ts'], bundle: true, platform: 'node', format: 'esm', outfile,
  plugins: [{ name: 'isolated-calendar', setup(b) {
    b.onResolve({ filter: /\/microsoftGraphMailService\.js$/ }, () => ({ path: 'graph-auth', namespace: 'test' }));
    b.onResolve({ filter: /\/personalMailbox\.js$/ }, () => ({ path: 'mailbox-auth', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, a => ({ contents: a.path === 'graph-auth' ? 'export const getMicrosoftGraphAccessToken=async()=>"test-only-token";' : `export const getPersonalMailboxForRequest=async()=>globalThis.calendarTestContext;export const handlePersonalMailboxError=(res,e)=>res.status(e.status||500).json({error:e.message});${['connectPersonalMailbox','disconnectPersonalMailbox','getPersonalMailboxStatus','sendPersonalMailboxTest'].map(n=>`export const ${n}=async()=>{throw Error("Unexpected mailbox action")};`).join('')}` }));
  } }] });
const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' }); process.exitCode = result.status || 0;
