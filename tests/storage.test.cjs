/* Run against a disposable QA copy, never a live user's data folder. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../web/js/engine.js'),[baseArg,qaRoot]=process.argv.slice(2);
if(!baseArg||!qaRoot)throw Error('Usage: node storage.test.cjs <QA index URL> <QA folder>');
const base=new URL('.',baseArg),url=name=>new URL(name,base),request=(name,options)=>fetch(url(name),options);
(async()=>{
  const saved=await(await request('api/state')).json();let snapshot;
  try{
    const state=E.empty('2026-12');state.rosters['2026-12']=[{id:'qa-1',name:'存档验证成员',department:'运营部',position:'部员'}];state.rosters['2027-02']=E.clone(state.rosters['2026-12']);state.works=[{id:'qa-w',code:'QA-W',title:'存档验证作品',month:'2026-12',platform:'学校官微',type:'官微图文',original:true,views:10000,participants:[{memberId:'qa-1',role:'文字'}]}];state.drafts=[{id:'qa-draft',code:'QA-D',title:'待核对草稿',month:'2027-02',participants:[]}];snapshot={schema:1,state,ui:{page:'personal'}};
    E.validateState(state);let response=await request('api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});assert.equal(response.status,200);
    const read=await(await request('api/state')).json();assert.deepEqual(read.state,snapshot.state);assert.equal(E.summarize(read.state,'2026-12').totalCents,20000);
    response=await request('api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});assert.equal(response.status,200);
    const archive=path.join(qaRoot,'数据','周期存档'),full=JSON.parse(fs.readFileSync(path.join(archive,'完整存档.json'),'utf8'));assert.deepEqual(full.state,snapshot.state);assert.ok(fs.existsSync(path.join(archive,'完整存档.json.previous')));
    const december=JSON.parse(fs.readFileSync(path.join(archive,'2026-12_2027-01','稿费数据.json'),'utf8')),january=JSON.parse(fs.readFileSync(path.join(archive,'2027-02_2027-03','稿费数据.json'),'utf8'));assert.equal(december.works.length,1);assert.equal(january.drafts.length,1);assert.equal(january.roster[0].id,'qa-1');
    response=await request('api/state',{method:'POST',body:JSON.stringify({...snapshot,state:{...state,kind:'performance'}})});assert.equal(response.status,409);assert.deepEqual((await(await request('api/state')).json()).state,state);
    response=await request('api/export?name=QA-test.xlsx',{method:'POST',body:new Uint8Array([1,2,3])});assert.equal(response.status,200);assert.deepEqual([...fs.readFileSync(path.join(qaRoot,'数据','输出','导出表格','QA-test.xlsx'))],[1,2,3]);
    response=await request('api/export?name='+encodeURIComponent('../bad.xlsx'),{method:'POST',body:'bad'});assert.equal(response.status,409);
    assert.equal((await request('数据/周期存档/完整存档.json')).status,404);assert.equal((await request('server/local-server.ps1')).status,404);assert.equal((await request('%2e%2e%2fREADME.md')).status,404);assert.equal((await request('.runtime.json')).status,404);
    assert.equal((await request('api/state',{headers:{Origin:'https://unrelated.example'}})).status,403);assert.equal((await fetch(new URL('/wrong-token/api/state',base))).status,404);
    console.log('Storage integration passed: atomic snapshots, previous backup, bimonthly mirrors, read-back totals, export, invalid package and access checks.');
  }finally{if(saved){const response=await request('api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});assert.equal(response.status,200,await response.text());}}
})().catch(e=>{console.error(e);process.exitCode=1;});
