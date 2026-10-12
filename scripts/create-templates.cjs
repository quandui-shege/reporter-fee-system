// Blank product templates, not user data. Run only when maintaining templates.
const fs=require('node:fs'),path=require('node:path'),X=require('../web/vendor/xlsx.full.min.js');
const dir=path.join(__dirname,'..','templates');fs.mkdirSync(dir,{recursive:true});
const layouts={
 '成员名单模板.xlsx':['姓名','部门'],
 '视频组活动模板.xlsx':['日期','活动名称','参与拍摄人员','活动时长'],
 '视频稿费模板.xlsx':['日期','视频名称','策划/负责人','时长（秒）','脚本','剪辑','拍摄','配音','场务灯光妆造模特','播放量'],
 '微博人员稿费模板.xlsx':['人员','稿费']
};
for(const [name,headers]of Object.entries(layouts)){const wb=X.utils.book_new(),sheet=X.utils.aoa_to_sheet([headers]);sheet['!cols']=headers.map(()=>({wch:24}));X.utils.book_append_sheet(wb,sheet,'Sheet1');fs.writeFileSync(path.join(dir,name),X.write(wb,{type:'buffer',bookType:'xlsx'}));}
console.log('Generated four blank input templates.');
