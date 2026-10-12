/* Reporter fees: exact rational cents; no AI amounts and no performance scores. */
(function(root){
  'use strict';
  const DEPARTMENTS=['主席团','运营部','北校摄影部','南校摄影部','国际摄影部','北校采编部','南校采编部','国际采编部','美编部','音视频部'];
  const TYPES=['官微图文','官微设计','视频','账号运营','微博汇总','小红书稿费','校报稿费','活动拍摄'];
  const WECHAT=['学校官微','国际官微','大学城官微'];
  const PLATFORMS=[...WECHAT,'抖音','B站','视频号','微博','小红书','校报'];
  const VIDEO_ROLES={'策划/负责人':20,'脚本':10,'剪辑':20,'配音':10,'拍摄':30,'场务灯光妆造模特':10};
  const FIXED={'文字':100,'图片':100,'策划':30,'原创编辑':30,'非原创编辑':15,'整理':15,'海报、壁纸、尾图制作':100,'可视化设计、H5制作、手绘':150};
  const FLOATING={};
  const ROLE_ALIASES={运营:'整理',海报:'海报、壁纸、尾图制作',壁纸:'海报、壁纸、尾图制作',尾图:'海报、壁纸、尾图制作',尾图制作:'海报、壁纸、尾图制作',制图:'海报、壁纸、尾图制作',可视化:'可视化设计、H5制作、手绘',可视化设计:'可视化设计、H5制作、手绘',H5:'可视化设计、H5制作、手绘',H5制作:'可视化设计、H5制作、手绘',手绘:'可视化设计、H5制作、手绘'};
  const TIERS={wechat:[[10000,100],[15000,150],[20000,200],[50000,600],[100000,1000]],video:[[10000,30],[30000,100],[50000,150],[100000,200],[150000,300],[200000,400]]};
  const defaultRules=()=>({fixed:{...FIXED},designOverrides:{},wechatRewards:Object.fromEntries(TIERS.wechat),videoRewards:Object.fromEntries(TIERS.video),operationsRate:2,activityBase:50,activityExtra:22.2,videoSecondRate:1,videoRateOverride:null,customItems:[],deletedIds:[]});
  function effectiveRules(rules){const d=defaultRules(),r={...d,...rules,fixed:{...d.fixed,...rules?.fixed},designOverrides:{...d.designOverrides,...rules?.designOverrides},wechatRewards:{...d.wechatRewards,...rules?.wechatRewards},videoRewards:{...d.videoRewards,...rules?.videoRewards},customItems:[...(rules?.customItems||[])],deletedIds:[...(rules?.deletedIds||[])]};for(const id of r.deletedIds){const [section,key]=id.split('.');if(['fixed','wechatRewards','videoRewards'].includes(section)&&key)r[section][key]=0;}return r;}
  function ruleItems(rules){const r=effectiveRules(rules),list=[];for(const name of Object.keys(FIXED))list.push({id:'fixed.'+name,scope:'wechat',project:['文字','图片'].includes(name)?'图文稿费':'策划、编辑与整理',name,amount:r.fixed[name],unit:'元/次',nullable:false,...(name==='整理'?{note:'运营对应整理，名单内参与人员均分'}:{})});for(const [name,range]of Object.entries(FLOATING))list.push({id:'designOverrides.'+name,scope:'wechat',project:'设计制作',name,amount:r.designOverrides[name],unit:'元/次',nullable:true,note:'留空沿用人工单价 '+range.join('–')+'元；设置后统一覆盖所有作品单价'});list.push({id:'videoRateOverride',scope:'video',project:'视频制作',name:'统一视频单价',amount:r.videoRateOverride,unit:'元/分钟',nullable:true,note:'留空沿用每件作品人工单价30–60元/分钟；设置后统一覆盖所有作品单价'},{id:'operationsRate',scope:'video',project:'账号运营',name:'每条发布稿费',amount:r.operationsRate,unit:'元/条',nullable:false});for(const scope of ['wechat','video'])for(const [threshold]of TIERS[scope])list.push({id:(scope==='wechat'?'wechatRewards.':'videoRewards.')+threshold,scope,project:'原创阅读量奖励',name:'达到 '+threshold+' 阅读 / 播放量',amount:r[scope==='wechat'?'wechatRewards':'videoRewards'][threshold],unit:'元/篇',nullable:false});for(const i of r.customItems)list.push({id:i.id,scope:i.scope,project:i.group,group:i.group,name:i.name,amount:i.amount,unit:"元/次",nullable:false,note:"录入时选择本项，所选人员均分"});list.push({id:'videoSecondRate',scope:'video',project:'视频稿费',name:'视频基本工资',amount:r.videoSecondRate,unit:'元/秒',nullable:false,note:'基础工资＝视频时长秒数 × 每秒金额'},{id:'activityBase',scope:'video',project:'视频组稿费',name:'两小时内活动稿费',amount:r.activityBase,unit:'元/次/人',nullable:false,note:'活动两小时以内（含两小时），每位参与人员独立领取；超过两小时仍保留基础金额'},{id:'activityExtra',scope:'video',project:'视频组稿费',name:'超过两小时额外补贴',amount:r.activityExtra,unit:'元/小时/人',nullable:false,note:'只计算超过两小时的部分，不足一小时按实际时长计算'});for(const i of list)if(i.scope==='video'&&i.project!=='视频组稿费')i.project='视频稿费';for(const i of list)if(i.scope==="wechat"&&!i.group)i.group=i.project==="原创阅读量奖励"?"绩效奖励":"基本工资";return list.filter(i=>!r.deletedIds.includes(i.id));}
  function validateRules(rules){if(!rules||typeof rules!=='object'||Array.isArray(rules))throw Error('稿费规则格式无效');if(rules.customItems!==undefined&&!Array.isArray(rules.customItems)||rules.deletedIds!==undefined&&!Array.isArray(rules.deletedIds))throw Error('规则小项或移除记录格式无效');const ids=new Set(),names=new Set(Object.keys(FIXED));for(const i of rules.customItems||[]){if(!i?.id||i.scope!=='wechat'||!['基本工资','绩效奖励'].includes(i.group)||!text(i.name)||ids.has(i.id)||names.has(i.name))throw Error('自定义小项名称、分组或编号无效');ids.add(i.id);names.add(i.name);}for(const item of ruleItems(rules)){if(item.nullable&&item.amount===null)continue;const value=String(item.amount);if(!/^\d+(?:\.\d{1,2})?$/.test(value)||!Number.isFinite(Number(value))||Number(value)>1000000)throw Error(item.name+'规则金额必须是0–1000000元的有效金额（最多两位小数）');}return rules;}
  function setRule(rules,id,value){const r=effectiveRules(rules),item=ruleItems(r).find(x=>x.id===id);if(!item)throw Error('规则不存在');const val=String(value??'').trim();if(!val&&!item.nullable)throw Error('该规则金额不能为空');if(val&&!/^\d+(?:\.\d{1,2})?$/.test(val))throw Error('请填写非负金额，最多两位小数');const amount=val===''?null:Number(val),custom=r.customItems.find(x=>x.id===id),parts=id.split('.');if(custom)r.customItems=r.customItems.map(x=>x.id===id?{...x,amount}:x);else if(parts.length===1)r[id]=amount;else r[parts[0]][parts[1]]=amount;validateRules(r);return r;}
  function addRule(rules,group,name,amount){const r=effectiveRules(rules),label=text(name);if(!['基本工资','绩效奖励'].includes(group))throw Error('请选择规则大项');if(!label||label.length>40||/[：:\n]/.test(label))throw Error('小项名称需为1–40字，不能包含冒号或换行');if([...Object.keys(FIXED),...Object.keys(ROLE_ALIASES),'文','图','撰文','文案','摄影','拍摄','统筹','选题策划','微信编辑','微信排版','排版','编辑','初审','复审','终审','审核','一审','二审',...r.customItems.map(x=>x.name)].some(x=>x.replace(/\s+/g,'')===label.replace(/\s+/g,'')))throw Error('该名称已存在（含已移除记录），请使用不同名称');if(!/^\d+(?:\.\d{1,2})?$/.test(String(amount)))throw Error('请填写有效非负金额，最多两位小数');r.customItems.push({id:'custom:'+uid(),scope:'wechat',group,name:label,amount:Number(amount)});validateRules(r);return r;}
  function removeRules(rules,ids){const r=effectiveRules(rules),active=new Set(ruleItems(r).filter(x=>x.scope==='wechat').map(x=>x.id));if(!ids.length||ids.some(id=>!active.has(id)))throw Error('请选择有效的官微小项');r.deletedIds=[...new Set([...r.deletedIds,...ids])];validateRules(r);return r;}
  const clone=x=>JSON.parse(JSON.stringify(x));
  const uid=()=>root.crypto?.randomUUID?.()||'fee-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const monthOK=m=>typeof m==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  function nextMonth(m,offset=1){if(!monthOK(m))throw Error('月份不正确');const [y,n]=m.split('-').map(Number),v=y*12+n-1+offset;return String(Math.floor(v/12)).padStart(4,'0')+'-'+String((v%12+12)%12+1).padStart(2,'0');}
  function periodStart(m){if(!monthOK(m))throw Error('周期月份不正确');return Number(m.slice(5))%2===0?m:nextMonth(m,-1);}
  const periodOK=m=>monthOK(m)&&periodStart(m)===m;
  function periodLabel(m){if(!periodOK(m))throw Error('请选择双月周期');const end=nextMonth(m),year=m.slice(0,4),a=Number(m.slice(5)),b=Number(end.slice(5));return year===end.slice(0,4)?year+'年'+a+'-'+b+'月':year+'年'+a+'月-'+end.slice(0,4)+'年'+b+'月';}
  const periodKey=m=>m+'_'+nextMonth(m);
  function parsePeriod(value){const raw=String(value??'').trim();if(periodOK(raw))return raw;let match=raw.match(/^(\d{4}-\d{2})[_至](\d{4}-\d{2})$/);if(match&&periodOK(match[1])&&nextMonth(match[1])===match[2])return match[1];match=raw.match(/^(\d{4})年(\d{1,2})-(\d{1,2})月$/);if(match){const start=match[1]+'-'+match[2].padStart(2,'0');if(periodOK(start)&&Number(nextMonth(start).slice(5))===Number(match[3]))return start;}match=raw.match(/^(\d{4})年(\d{1,2})月-(\d{4})年(\d{1,2})月$/);if(match){const start=match[1]+'-'+match[2].padStart(2,'0'),end=match[3]+'-'+match[4].padStart(2,'0');if(periodOK(start)&&nextMonth(start)===end)return start;}throw Error('周期请填写如2026-10_2026-11，或2026年10-11月；仅支持固定双月周期');}
  const empty=m=>{const start=periodStart(m);return {schema:1,kind:'reporter-fee',version:2,periodMode:'bimonthly',rules:defaultRules(),month:start,rosters:{[start]:[]},works:[],drafts:[],audit:[]};};
  const channelFor=w=>w.type==='微博汇总'?'weibo':['小红书稿费','校报稿费'].includes(w.type)?'xiaohongshu':['视频','账号运营','活动拍摄'].includes(w.type)?'video':w.type?.startsWith('官微')?'wechat':w.channel==='video'?'video':'wechat';
  const zero=()=>({n:0n,d:1n});
  const gcd=(a,b)=>{while(b){const t=a%b;a=b;b=t;}return a;};
  function rational(n,d=1n){if(d<=0n)throw Error('分母无效');const g=gcd(n<0n?-n:n,d)||1n;return {n:n/g,d:d/g};}
  const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
  const mul=(a,b)=>rational(a.n*b.n,a.d*b.d);
  const div=(a,b)=>{if(b.n<=0n)throw Error('分配人数或比例无效');return rational(a.n*b.d,a.d*b.n);};
  function decimal(v,label='数值',places=4){const s=String(v??'').trim();if(!new RegExp('^\\d+(?:\\.\\d{1,'+places+'})?$').test(s))throw Error(label+'必须为非负数字（最多'+places+'位小数）');const [a,b='']=s.split('.');return rational(BigInt(a+b),10n**BigInt(b.length));}
  const cents=(v,label)=>mul(decimal(v,label,2),rational(100n));
  const num=a=>Number(a.n)/Number(a.d);
  const floor=a=>Number(a.n/a.d);
  const payout=a=>a.n% (100n*a.d)===25n*a.d?Number(a.n/a.d):Number(a.n/(10n*a.d))*10;
  const money=c=>(c/100).toFixed(c%10?2:1);
  const sharePayout=(amountCents,count)=>count?payout(rational(BigInt(amountCents),BigInt(count))):0;
  const priceShare=(amount,count)=>count?payout(div(cents(amount,'分配金额'),rational(BigInt(count)))):0;
  const roles=(type,rules,includeDeleted=false)=>type==='视频'?Object.keys(VIDEO_ROLES):type==='账号运营'?['账号运营']:type==='活动拍摄'?['活动拍摄']:[...Object.keys(FIXED).filter(k=>includeDeleted||!rules?.deletedIds?.includes('fixed.'+k)),...(rules?.customItems||[]).filter(i=>i.scope==='wechat'&&(includeDeleted||!rules?.deletedIds?.includes(i.id))).map(i=>i.name)];
  const text=x=>String(x??'').trim();
  function reward(views,video,rules){let amount=0;const r=effectiveRules(rules),key=video?'videoRewards':'wechatRewards';for(const [threshold] of TIERS[video?'video':'wechat'])if(views>=threshold&&!r.deletedIds.includes(key+'.'+threshold))amount=r[key][threshold];return amount;}
  function validMember(m){if(!m||!text(m.id)||!text(m.name)||!DEPARTMENTS.includes(m.department))throw Error('成员姓名、编号或部门无效');if(!(m.department==='主席团'?['团长']:['部长','副部长','部员']).includes(m.position))throw Error('成员职务无效');}
  function matchMember(state,month,department,name){const matches=(state.rosters[month]||[]).filter(m=>m.name===text(name)&&(!department||m.department===text(department)));return {member:matches.length===1?matches[0]:null,error:matches.length>1?'成员重名，请手动选择':'该月份成员名单中未找到此人'};}
  function memberReferenced(state,id,month){return [...state.works,...state.drafts].some(w=>(!month||w.month===month)&&[...(w.participants||[]),...(w.reviewParticipants||[])].some(p=>p.memberId===id));}
  function removeMembers(state,month,ids){const chosen=new Set(ids),list=state.rosters[month]||[];if(!chosen.size)throw Error('请先选择成员');if([...chosen].some(id=>!list.some(m=>m.id===id)))throw Error('成员不在当前周期名单中');const locked=list.filter(m=>chosen.has(m.id)&&memberReferenced(state,m.id,month));if(locked.length)throw Error('以下成员有关联稿费或复核记录，不能移除：'+locked.map(m=>m.name).join('、'));state.rosters[month]=list.filter(m=>!chosen.has(m.id));return state;}
  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
  function dateDisplay(work){if(!validDate(work.publicationDate))return work.dateDisplay||work.publicationDate||'';const raw=String(work.dateDisplay||''),suffix=raw.match(/(?:\d{4}[-/.])?\d{1,2}[-/.]\d{1,2}(.*)$/)?.[1]||'';return Number(work.publicationDate.slice(5,7))+'.'+Number(work.publicationDate.slice(8,10))+suffix;}
  function workScope(work){return work.type==='活动拍摄'?'videoGroup':channelFor(work)==='video'?'videoProduction':channelFor(work);}
  function workRules(work,state){return effectiveRules(work.sharedRules||state.scopeRules?.[work.month]?.[workScope(work)]||state.rules);}
  function calculate(work,state){
    const rules=workRules(work,state);
    const errors=[],warnings=[],accounts=new Map();let theoreticalBase=zero(),theoreticalBonus=zero();
    const error=t=>{if(!errors.includes(t))errors.push(t);};
    if(!(state.version===2?periodOK(work.month):monthOK(work.month)))error('请选择有效的归属双月周期');
    if(!text(work.title))error('请填写作品标题');
    if(!text(work.code))error('请填写作品编号');
    if(work.publicationDate){const value=text(work.publicationDate);if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)error('发布日期不正确');}
    if(!TYPES.includes(work.type))error('请选择本版支持的作品类型');
    if(!PLATFORMS.includes(work.platform))error('请选择本版支持的平台');
    if(work.type.startsWith('官微')&&!WECHAT.includes(work.platform))error('官微作品必须选择学校、国际或大学城官微');
    if(['微博汇总','小红书稿费','校报稿费'].includes(work.type)){const roster=state.rosters[work.month]||[],seen=new Set(),lines=[];if(work.platform!==(work.type==='微博汇总'?'微博':work.type==='校报稿费'?'校报':'小红书'))error('直接稿费平台不正确');if(!work.participants?.length)error('请选择至少一名名单内成员');for(const p of work.participants||[]){const m=roster.find(m=>m.id===p.memberId);if(!m||m.isTeacher===true){error((p.name||'成员')+'未匹配当前周期名单');continue;}if(seen.has(m.id)){error(m.name+'重复，请合并金额后登记');continue;}seen.add(m.id);try{const value=floor(cents(p.amount,'导入或登记金额'));if(value>100000000)throw Error('单人金额不能超过1000000元');lines.push({memberId:m.id,name:m.name,department:m.department,position:m.position,roles:[work.title],baseCents:value,bonusCents:0,totalCents:value,basis:'从《'+work.title+'》'+(work.type==='微博汇总'?'人员 / 稿费汇总读取':'手动登记')+'；'+money(value)+'元，按登记金额直接计入',source:work.source||work.title});}catch(ex){error(ex.message);}}const total=lines.reduce((sum,l)=>sum+l.totalCents,0);return {valid:!errors.length,errors,warnings,lines,components:[],theoreticalBase:total/100,theoreticalBonus:0,theoreticalTotal:total/100,actualBaseCents:total,actualBonusCents:0,actualCents:total,discarded:0};}
    if(work.type==='活动拍摄'){const roster=state.rosters[work.month]||[],seen=new Set(),lines=[];let hours=zero(),perPerson=zero();try{hours=decimal(work.activityHours,'活动时长');if(hours.n<=0n||num(hours)>10000)throw Error('活动时长需大于0且不超过10000小时');const extra=hours.n>2n*hours.d?rational(hours.n-2n*hours.d,hours.d):zero();perPerson=add(cents(rules.activityBase,'活动基础稿费'),mul(extra,cents(rules.activityExtra,'活动补贴')));}catch(ex){error(ex.message);}if(!work.participants?.length)error('请选择参与拍摄人员');for(const p of work.participants||[]){const m=roster.find(m=>m.id===p.memberId);if(!m||m.isTeacher===true){error('参与人员必须匹配当前周期名单');continue;}if(seen.has(m.id)){error(m.name+'重复，请只选择一次');continue;}seen.add(m.id);const value=floor(perPerson);lines.push({memberId:m.id,name:m.name,department:m.department,position:m.position,roles:['活动拍摄'],baseCents:value,bonusCents:0,totalCents:value,basis:'活动拍摄 '+work.activityHours+'小时；每人基础 '+rules.activityBase+'元；超过两小时部分 '+Math.max(0,num(hours)-2)+'小时 × '+rules.activityExtra+'元/小时；个人实发 '+money(value)+'元',source:work.source||'视频组活动拍摄登记'});}const total=lines.reduce((n,l)=>n+l.totalCents,0),theoretical=num(perPerson)*lines.length/100;return {valid:!errors.length,errors,warnings,lines,components:[],theoreticalBase:theoretical,theoreticalBonus:0,theoreticalTotal:theoretical,actualBaseCents:total,actualBonusCents:0,actualCents:total,discarded:theoretical-total/100};}
    const isVideo=work.type==='视频',isOperations=work.type==='账号运营';
    if(!isOperations&&!isVideo&&typeof work.original!=='boolean')error('请确认作品是否原创');
    let views=0;
    if(!isOperations){if(!/^\d+$/.test(text(work.views))||!Number.isSafeInteger(Number(work.views)))error('请填写非负整数阅读量 / 播放量；没有奖励也需确认0');else views=Number(work.views);}
    if(work.rewardPlatform&&!PLATFORMS.includes(work.rewardPlatform))error('计奖平台无效');
    const people=state.rosters[work.month]||[],participants=Array.isArray(work.participants)?work.participants:[];
    if(!participants.length)error('至少登记一名参与人');
    const grouped=new Map(),seen=new Set(),originalSeen=new Set();
    for(const p of participants){
      const m=people.find(x=>x.id===p.memberId),originalRole=text(p.role),role=ROLE_ALIASES[originalRole]||originalRole,key=p.memberId+'|'+role;
      if(!m){error((p.name||'参与人')+'未匹配该月份名单，请选择成员');continue;}
      if(m.isTeacher===true){error('老师不计稿费，请从参与分工中移除：'+m.name);continue;}
      if(!roles(work.type,rules,true).includes(role)){error('无效分工：'+(role||'未选择'));continue;}
      const originalKey=p.memberId+'|'+originalRole;if(originalSeen.has(originalKey)){error(m.name+'的“'+role+'”分工重复');continue;}originalSeen.add(originalKey);if(seen.has(key))continue;seen.add(key);
      if(!accounts.has(m.id))accounts.set(m.id,{memberId:m.id,name:m.name,department:m.department,position:m.position,roles:[],base:zero(),bonus:zero(),basis:[],sources:new Set()});
      accounts.get(m.id).roles.push(role);if(p.source)accounts.get(m.id).sources.add(p.source);if(!grouped.has(role))grouped.set(role,[]);grouped.get(role).push(p);
    }
    const components=[];function credit(id,amount,basis,kind='base',role=''){const a=accounts.get(id),paid=(!isVideo&&!isOperations)?rational(BigInt(payout(amount))):amount;a[kind]=add(a[kind],paid);a.basis.push(basis);components.push({memberId:id,name:a.name,role,kind,amountCents:payout(amount)});}
    function allocate(role,total,description,fixedEqual=false,kind='base'){
      const list=grouped.get(role)||[];if(!list.length)return;
      let weights=[];
      try{
        const custom=(isVideo||isOperations)&&list.some(p=>text(p.share)!=='');
        if(custom&&!fixedEqual){if(list.some(p=>text(p.share)===''))throw Error(role+'自定义比例需为所有参与人填写');weights=list.map(p=>decimal(p.share,role+'分配比例',4));const sum=weights.reduce(add,zero());if(sum.n!==100n*sum.d)throw Error(role+'分配比例合计必须为100%');}
        else {if(fixedEqual&&custom)throw Error('策划固定均分，请清空分配比例');weights=list.map(()=>rational(100n,BigInt(list.length)));}
        list.forEach((p,i)=>credit(p.memberId,mul(total,div(weights[i],rational(100n))),description+'；'+(custom&&!fixedEqual?'岗位内 '+text(p.share)+'%':'岗位内 '+list.length+' 人均分'),kind,role));
        if(kind==='bonus')theoreticalBonus=add(theoreticalBonus,total);else theoreticalBase=add(theoreticalBase,total);
      }catch(e){error(e.message);}
    }
    if(isVideo){
      try{
        const perSecond=work.videoPricing==='perSecond',videoRate=rules.videoRateOverride??work.videoRate,duration=decimal(work.durationSeconds,'视频时长（秒）',3),rate=cents(perSecond?rules.videoSecondRate:videoRate,'视频单价');if(duration.n<=0n)throw Error('视频时长必须大于0');if(!perSecond&&rules.videoRateOverride===null&&(num(rate)<3000||num(rate)>6000))throw Error('视频单价必须在30–60元/分钟');
        const total=perSecond?mul(duration,rate):mul(div(duration,rational(60n)),rate);let vacant=0;
        for(const [role,percent] of Object.entries(VIDEO_ROLES)){if(grouped.has(role))allocate(role,mul(total,rational(BigInt(percent),100n)),(perSecond?text(work.durationSeconds)+'秒 × '+rules.videoSecondRate+'元/秒':text(work.durationSeconds)+'秒 ÷ 60 × '+text(videoRate)+'元/分钟')+' × '+role+' '+percent+'%'+(rules.videoRateOverride!==null?'（统一规则单价）':''));else vacant+=percent;}
        if(vacant&&accounts.size){const amount=mul(total,rational(BigInt(vacant),100n)),each=div(amount,rational(BigInt(accounts.size)));for(const id of accounts.keys())credit(id,each,'空缺岗位 '+vacant+'% 平均分给 '+accounts.size+' 名制作人员');theoreticalBase=add(theoreticalBase,amount);}
      }catch(e){error(e.message);}
    }else if(isOperations){
      try{if(!/^\d+$/.test(text(work.publishCount))||!Number.isSafeInteger(Number(work.publishCount))||Number(work.publishCount)<=0)throw Error('发布次数必须为正整数');allocate('账号运营',mul(rational(BigInt(work.publishCount)),cents(rules.operationsRate,'运营规则金额')),text(work.publishCount)+'次 × '+rules.operationsRate+'元/条');}catch(e){error(e.message);}
    }else{
      if(grouped.has('策划')&&grouped.get('策划').length>3)error('策划人数不得超过3人');
      if(grouped.has('原创编辑')&&work.original!==true)error('原创编辑要求确认作品原创');
      if(grouped.has('非原创编辑')&&work.original!==false)error('非原创编辑要求确认作品非原创');
      if(grouped.has('原创编辑')&&grouped.has('非原创编辑'))error('同一作品不能同时登记原创与非原创编辑');
      for(const role of Object.keys(FIXED)){const amount=rules.fixed[role];allocate(role,cents(amount,role+'规则金额'),role+' '+amount+'元',role==='策划');}
      for(const item of rules.customItems.filter(i=>i.scope==='wechat')){if(!grouped.has(item.name))continue;const amount=rules.deletedIds.includes(item.id)?0:item.amount;allocate(item.name,cents(amount,item.name+'规则金额'),item.name+' '+amount+'元（'+item.group+'）',false,item.group==='绩效奖励'?'bonus':'base');}
      for(const [role,[low,high]] of Object.entries(FLOATING)){if(!grouped.has(role))continue;try{const value=rules.designOverrides[role]??work.rates?.[role],rate=cents(value,role+'单价');if(rules.designOverrides[role]===null&&(num(rate)<low*100||num(rate)>high*100))throw Error(role+'单价必须在'+low+'–'+high+'元');allocate(role,rate,role+' '+text(value)+'元'+(rules.designOverrides[role]!==null?'（统一规则单价）':''));}catch(e){error(e.message);}}
    }
    if(!isOperations&&accounts.size&&(isVideo||work.original===true)){
      let award=floor(cents(reward(views,isVideo,rules),'奖励规则金额'));
      if(text(work.extraReward)!==''){try{const extra=cents(work.extraReward,'额外奖励');if(!isVideo||views<=200000)throw Error('仅播放量超过200000的视频可登记额外奖励');if(extra.n>0n&&!text(work.extraRewardNote))throw Error('请填写额外奖励确认依据');award+=floor(extra);}catch(e){error(e.message);}}
      const regularBonus=rational(BigInt(award));theoreticalBonus=add(theoreticalBonus,regularBonus);const each=div(regularBonus,rational(BigInt(accounts.size)));
      if(award)for(const id of accounts.keys())credit(id,each,(isVideo?'视频播放量 ':'原创阅读量 ')+views+'（计奖平台：'+(work.rewardPlatform||work.platform)+'），最高档及确认额外奖励 '+money(award)+'元；'+accounts.size+' 人去重均分','bonus','阅读量奖励');
    }else if(text(work.extraReward)!=='')error('额外奖励仅适用于视频');
    const lines=[...accounts.values()].map(a=>({memberId:a.memberId,name:a.name,department:a.department,position:a.position,roles:a.roles,baseCents:(!isVideo&&!isOperations)?floor(a.base):payout(a.base),bonusCents:(!isVideo&&!isOperations)?floor(a.bonus):payout(a.bonus),totalCents:(!isVideo&&!isOperations)?floor(a.base)+floor(a.bonus):payout(a.base)+payout(a.bonus),basis:a.basis.join('；'),source:[work.source||'表单录入',...a.sources].join('；')}));
    const actualBase=lines.reduce((s,l)=>s+l.baseCents,0),actualBonus=lines.reduce((s,l)=>s+l.bonusCents,0),theory=add(theoreticalBase,theoreticalBonus);
    if(!Number.isSafeInteger(actualBase+actualBonus))error('金额超过安全计算范围');
    const actual=actualBase+actualBonus;
    return {valid:errors.length===0,errors,warnings,lines,components,theoreticalBase:num(theoreticalBase)/100,theoreticalBonus:num(theoreticalBonus)/100,theoreticalTotal:num(theory)/100,actualBaseCents:actualBase,actualBonusCents:actualBonus,actualCents:actual,discarded:num(theory)/100-actual/100};
  }
  const linkKey=l=>{try{const u=new URL(text(l));u.hash='';return u.href;}catch{return text(l);}};
  function duplicates(state,work){const exact=[],suspected=[];for(const other of state.works){if(other.id===work.id||(work.duplicateImportOf||[]).includes(other.id)||(other.duplicateImportOf||[]).includes(work.id))continue;const sameFamily=(other.type==='账号运营')===(work.type==='账号运营');if(text(other.code)===text(work.code)||sameFamily&&text(work.link)&&linkKey(other.link)===linkKey(work.link))exact.push(other);else if(sameFamily&&text(other.title)===text(work.title)&&(work.type!=='账号运营'||work.platform===other.platform))suspected.push(other);}return {exact,suspected};}
  function canConfirm(state,work){const calc=calculate(work,state),dup=duplicates(state,work),replaced=new Set(work.supersedesIds||[]);if((work.requireDate||work.type==='视频'&&work.videoPricing==='perSecond')&&!validDate(work.publicationDate))calc.errors.push('请填写有效日期');if(work.creditsText&&!work.creditsApplied)calc.errors.push('分工文本有变动，请重新识别再确认');if(dup.exact.some(w=>!replaced.has(w.id)))calc.errors.push('作品编号或链接与已入账作品重复，请编辑原作品或处理重复视频');if(dup.suspected.some(w=>!(work.distinctFrom||[]).includes(w.id)&&!replaced.has(w.id)))calc.errors.push('同名作品需确认是不同作品，或先处理重复发布');if(replaced.size&&(!text(work.duplicateNote)||work.type!=='视频'))calc.errors.push('替换重复记录需通过视频核对并填写依据');calc.valid=calc.errors.length===0;return {...calc,duplicates:dup};}
  function summarize(state,start){if(!periodOK(start))throw Error('仅支持双月周期查看');const months=[start],members=new Map(),lines=[],workTotals=[];
    for(const month of months)for(const m of state.rosters[month]||[]){if(!members.has(m.id))members.set(m.id,{...m,baseCents:0,bonusCents:0,totalCents:0,channelCents:{wechat:0,video:0,weibo:0,xiaohongshu:0}});}
    for(const w of state.works.filter(w=>months.includes(w.month))){const c=calculate(w,state);if(!c.valid)throw Error('已确认作品“'+w.title+'”数据不完整：'+c.errors.join('；'));workTotals.push({work:w,calc:c});for(const l of c.lines){const m=members.get(l.memberId);m.baseCents+=l.baseCents;m.bonusCents+=l.bonusCents;m.totalCents+=l.totalCents;m.channelCents[channelFor(w)]+=l.totalCents;lines.push({...l,workId:w.id,code:w.code,month:w.month,title:w.title,platform:w.platform,type:w.type,link:w.link||'',views:w.views,videoRate:effectiveRules(state.rules).videoRateOverride??w.videoRate??'',durationSeconds:w.durationSeconds||''});}}
    return {months,periodStart:start,periodLabel:periodLabel(start),members:[...members.values()],lines,workTotals,totalCents:[...members.values()].reduce((s,m)=>s+m.totalCents,0)};
  }
  function validateState(s){
    if(!s||s.schema!==1||s.kind!=='reporter-fee'||![1,2].includes(s.version)||!monthOK(s.month)||!s.rosters||typeof s.rosters!=='object'||Array.isArray(s.rosters)||!Array.isArray(s.works)||!Array.isArray(s.drafts)||!Array.isArray(s.audit))throw Error('请选择本系统稿费备份；绩效数据包不兼容');
    if(s.version===2&&(s.periodMode!=='bimonthly'||!periodOK(s.month)||Object.keys(s.rosters).some(m=>!periodOK(m))||[...s.works,...s.drafts].some(w=>!periodOK(w.month))))throw Error('稿费只支持按固定双月周期保存');
    if(s.rules)validateRules(s.rules);if(s.scopeRules){if(typeof s.scopeRules!=='object'||Array.isArray(s.scopeRules))throw Error('分享规则格式无效');for(const [month,scopes]of Object.entries(s.scopeRules)){if(!periodOK(month)||!scopes||typeof scopes!=='object'||Array.isArray(scopes))throw Error('分享规则周期无效');for(const [key,value]of Object.entries(scopes)){if(!['wechat','videoGroup','videoProduction','weibo','xiaohongshu'].includes(key))throw Error('分享规则类别无效');validateRules(value);}}}
    if(s.works.length+s.drafts.length>100000)throw Error('作品数量超过限制');
    const identities=new Map();for(const [month,members] of Object.entries(s.rosters)){if(!monthOK(month)||!Array.isArray(members)||members.length>10000)throw Error('月份名单格式无效');const ids=new Set();for(const m of members){validMember(m);if(ids.has(m.id))throw Error('名单中成员编号重复');ids.add(m.id);const identity=m.name+'|'+m.department;if(identities.has(m.id)&&identities.get(m.id)!==identity)throw Error('同一成员编号对应不同姓名或部门');identities.set(m.id,identity);}}
    const ids=new Set();for(const w of [...s.works,...s.drafts]){if(!w||!text(w.id)||!monthOK(w.month)||!Array.isArray(w.participants)||ids.has(w.id))throw Error('作品或草稿格式无效 / 编号重复');ids.add(w.id);if(w.sharedRules)validateRules(w.sharedRules);}
    for(const w of s.works){const c=calculate(w,s);if(!c.valid)throw Error('备份中已确认作品无效：'+w.title+'；'+c.errors.join('；'));if(duplicates(s,w).exact.length)throw Error('备份中已确认作品重复');}
    return s;
  }
  function migrateState(source){validateState(source);if(source.version===2){const s=clone(source);s.rules=effectiveRules(s.rules);if(s.drafts.length){s.legacyDraftArchive=[...(s.legacyDraftArchive||[]),...s.drafts];s.drafts=[];}return s;}const s=clone(source),merged={};for(const [month,list] of Object.entries(s.rosters).sort(([a],[b])=>a.localeCompare(b))){const start=periodStart(month),map=new Map((merged[start]||[]).map(m=>[m.id,m]));for(const m of list)map.set(m.id,m);merged[start]=[...map.values()];}s.rosters=merged;s.month=periodStart(s.month);s.rosters[s.month]??=[];for(const w of [...s.works,...s.drafts]){w.publicationMonth??=w.month;w.month=periodStart(w.month);w.channel=channelFor(w);s.rosters[w.month]??=[];}s.version=2;s.periodMode='bimonthly';s.rules=effectiveRules(s.rules);if(s.drafts.length){s.legacyDraftArchive=[...(s.legacyDraftArchive||[]),...s.drafts];s.drafts=[];}s.audit.push({at:new Date().toISOString(),action:'月度数据迁入双月周期',detail:'保留作品原归属月份和人员编号，合并相邻两个月名单与记录'});validateState(s);return s;}
  const api={DEPARTMENTS,TYPES,WECHAT,PLATFORMS,VIDEO_ROLES,FIXED,FLOATING,ROLE_ALIASES,TIERS,addRule,removeRules,defaultRules,effectiveRules,ruleItems,setRule,validateRules,roles,clone,uid,monthOK,nextMonth,periodStart,periodOK,periodLabel,periodKey,parsePeriod,channelFor,migrateState,empty,money,sharePayout,priceShare,reward,validMember,matchMember,memberReferenced,removeMembers,validDate,dateDisplay,workScope,workRules,calculate,duplicates,canConfirm,summarize,validateState};
  root.FeeEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis==='undefined'?this:globalThis);
