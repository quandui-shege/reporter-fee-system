const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [a,b]=process.argv.slice(2);const request=(root,name,options)=>fetch(new URL('api/'+name,JSON.parse(fs.readFileSync(path.join(root,'.runtime.json'),'utf8')).url),options);
(async()=>{assert.equal((await(await request(a,'key')).json()).key,'qa-only-fake-local-key-A','Key must survive same-folder restart');assert.equal((await(await request(b,'key')).json()).key,'qa-only-fake-local-key-B');
 for(const root of [a,b]){assert.equal((await request(root,'key',{method:'DELETE'})).status,200);assert.equal((await(await request(root,'key')).json()).key,'');assert.equal(fs.existsSync(path.join(root,'数据','.deepseek-key')),false);assert.equal((await request(root,'shutdown',{method:'POST'})).status,200);}
 console.log('Folder isolation, restart persistence, local key removal and shutdown passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
