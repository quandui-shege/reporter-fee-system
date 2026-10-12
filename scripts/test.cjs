const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const files=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')&&f!=='storage.test.cjs').map(f=>path.join(root,'tests',f));
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});if(result.error)throw result.error;process.exit(result.status??1);
