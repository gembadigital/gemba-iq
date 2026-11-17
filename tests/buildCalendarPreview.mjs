import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const out = '/tmp/gemba-calendar-preview';
await fs.mkdir(out, { recursive: true });
await build({ entryPoints: ['tests/calendar.browser.tsx'], outfile: `${out}/preview.js`, bundle: true, platform: 'browser', define: { 'import.meta.env': '{}' }, loader: { '.css': 'empty' },
  plugins: [{ name: 'offline-calendar', setup(b) {
    b.onResolve({ filter: /\/(personalCalendar|personalMailbox|CrmDb)$/ }, a => ({ path: a.path.split('/').pop(), namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, a => ({ contents: a.path === 'personalMailbox' ? `export const fetchPersonalMailbox=async()=>({status:window.calendarFixture.connected?'Connected':'Disconnected',mailbox_address:'owner@example.test'});` : a.path === 'CrmDb' ? `export const CrmDb={getCompanies:()=>[{id:'c1',name:'Örnek müşteri'}],getKv:()=>window.calendarFixture.meetings};` : `const f=()=>window.calendarFixture;
      export const fetchPersonalCalendarEvents=async()=>{if(f().failure)throw Error('Test: Calendars.ReadWrite izni eksik');return {events:structuredClone(f().events),mailbox:'owner@example.test',syncedAt:new Date().toISOString()}};
      export const savePersonalCalendarAppointment=async v=>{if(f().saveFailure)throw Error('Test: kayıt başarısız'); const e={id:v.eventId||v.transactionId,subject:v.subject,start:{dateTime:new Date(v.start+'+03:00').toISOString(),timeZone:'UTC'},end:{dateTime:new Date(v.end+'+03:00').toISOString(),timeZone:'UTC'},location:v.location,editable:true,isAllDay:false};if(v.eventId){f().events=f().events.map(x=>x.id===v.eventId?e:x);f().updates++}else{f().events.push(e);f().createCount++}return {success:true,eventId:e.id}};
      export const removePersonalCalendarAppointment=async id=>{f().events=f().events.filter(e=>e.id!==id);f().deletes++};` }));
  } }] });
const files = await fs.readdir('dist/assets');
for (const [prefix, name] of [['index-','base.css'],['App-','theme.css']]) await fs.copyFile(path.join('dist/assets', files.find(f => f.startsWith(prefix) && f.endsWith('.css'))), `${out}/${name}`);
await fs.writeFile(`${out}/index.html`, '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="theme.css"><div id="root"></div><script src="preview.js"></script></html>');
await fs.copyFile('tests/calendarResponsive.html', `${out}/responsive.html`);
console.log(out);
