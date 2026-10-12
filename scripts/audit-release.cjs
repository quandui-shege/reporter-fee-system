// Inspect a clean release tree without printing secrets or personal data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{if(e.name==='.git'||e.name==='node_modules')return [];const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];});}
const failures=[];
for(const p of walk(root)){const rel=path.relative(root,p).replaceAll('\\','/');
 if(rel.startsWith('数据/')&&!rel.endsWith('/.gitkeep')&&rel!=='数据/README.md')failures.push(rel+': runtime data');
 if(/(^|\/)(\.runtime\.json|\.deepseek-key.*|\.env(?:\..*)?)$|\.(previous|tmp)$|(^|\/)~\$/.test(rel))failures.push(rel+': local credential/runtime file');
 if(/\.(js|cjs|ps1|json|md|html|txt|css|yml)$/.test(rel)&&!rel.startsWith('web/vendor/')){
  const text=fs.readFileSync(p,'utf8');
  if(/\bsk-[A-Za-z0-9_-]{16,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))failures.push(rel+': potential credential');
  if(/[A-Za-z]:[\\/]Users[\\/]|[A-Za-z]:[\\/].*Desktop/.test(text))failures.push(rel+': personal absolute path');
 }
}
assert.equal(failures.length,0,'Release is not clean:\n'+failures.join('\n'));
console.log('Clean release: no local records, keys, runtime files, private keys or user-specific paths.');
