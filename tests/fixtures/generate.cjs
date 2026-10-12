// Fabricated regression examples. No original rosters or workbook metadata.
const fs=require('node:fs'),path=require('node:path'),X=require('../../web/vendor/xlsx.full.min.js');
const n=i=>'测试成员'+String(i).padStart(2,'0');
function write(name,rows,sheet='Sheet1'){const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(rows),sheet);fs.writeFileSync(path.join(__dirname,name),X.write(wb,{type:'buffer',bookType:'xlsx'}));}
write('video-production.xlsx',[
 ['时间','视频名称','','负责人20%','时长','绩效奖励','总工资/元','剧本10%','剪辑20%','拍摄30%','配乐10%','模特10%','播放量'],[],
 ['6.1','测试视频一','',[n(1),n(2)].join('，'),'1min6s','','','',n(1),[n(1),n(2)].join('，'),'','','1.2w'],
 ['6.19','测试视频二','',[n(3),n(4),n(1)].join('，'),'1min18s','','','',n(1),n(1),'',n(5),'2.6w'],
 ['6.28','测试视频三','',n(6),'5min18s','','','',n(6),'','','','1.7w']
]);
const activities=[['时间','活动名称','参与拍摄人员','活动时长']];
for(let i=0;i<10;i++)activities.push([i===0?'9.5上午':i===1?'9.5下午':'9.'+(i+6),i<2?'测试活动一':'测试活动'+(i+1),Array.from({length:i===0?10:2},(_,j)=>n(15+j)).join('，'),i===0?'4h':i===1?'2h':'3h']);
write('video-activities.xlsx',activities,'工作表1');
const summary=Array.from({length:44},()=>[]);summary[0]=['测试人员金额汇总'];summary[33]=['','','人员','稿费'];
const ids=[7,8,9,10,11,12,2,13,14],amounts=[87.9,133.5,36.1,56.8,36.1,162,32.4,51.2,51.2];
ids.forEach((id,i)=>summary[34+i]=['','',n(id),amounts[i]]);summary[43]=['','','',647.2];write('weibo-summary.xlsx',summary);
console.log('Generated three synthetic regression fixtures.');
