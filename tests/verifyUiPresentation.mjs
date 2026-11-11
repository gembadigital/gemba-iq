// Compare production components against the pre-rollout commit. This guards
// the user's requirement that a visual rollout must not alter CRM behavior.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const baseline=process.argv[2]||'0fd572090a6d9b41c26fbe3a4facfa5c6b6f5a56';
const files=execFileSync('git',['diff',baseline,'--name-only','--','src'],{encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.tsx'));
function normalize(source,file){
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function visit(n){
  if(ts.isImportDeclaration(n)&&/\.css["']$/.test(n.moduleSpecifier.getText(sf)))edits.push([n.getStart(sf),n.end,'']);
  if(ts.isJsxElement(n)&&n.openingElement.attributes.properties.length===1&&n.openingElement.attributes.properties[0].name?.getText(sf)==='data-crm-scroll'&&n.children.length===1&&ts.isJsxElement(n.children[0])&&n.children[0].openingElement.tagName.getText(sf)==='table'){
   edits.push([n.openingElement.getStart(sf),n.openingElement.end,''],[n.closingElement.getStart(sf),n.closingElement.end,'']);
   visit(n.children[0]);return;
  }
  if(ts.isJsxAttribute(n)&&n.name.getText(sf)==='role'){
   const opening=n.parent.parent, tag=opening.tagName?.getText(sf), roles={table:'table',thead:'rowgroup',tbody:'rowgroup',tr:'row',th:'columnheader',td:'cell'};
   let parent=opening, proposalTable=false;
   while(parent){if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(sf)==='table'&&parent.openingElement.attributes.getText(sf).includes('crm-data-table')){proposalTable=true;break;}parent=parent.parent;}
   if(proposalTable&&n.initializer?.getText(sf)===JSON.stringify(roles[tag]))edits.push([n.pos,n.end,'']);
  }
  if(ts.isJsxAttribute(n)&&n.name.getText(sf).startsWith('data-crm-'))edits.push([n.pos,n.end,'']);
  ts.forEachChild(n,visit);
 }
 visit(sf);edits.sort((a,b)=>b[0]-a[0]);for(const [a,b,str]of edits)source=source.slice(0,a)+str+source.slice(b);
 return ts.createPrinter().printFile(ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));
}
let failures=[];for(const file of files){const before=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',maxBuffer:10*1024*1024});if(normalize(before,file)!==normalize(fs.readFileSync(file,'utf8'),file))failures.push(file);}
if(failures.length){console.error('Non-presentation changes found:',failures);process.exit(1);}
console.log(`PASS: ${files.length} production components retain their logic, handlers, fields and document content.`);
