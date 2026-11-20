const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const components = new Map();
  new Function('require','module','exports',code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return new Proxy({}, {get:(_,key)=>{
      if(!components.has(key)) components.set(key, function Component(){return null});
      return components.get(key);
    }});
    return require(name);
  },module,module.exports);
  return module.exports;
}
async function main(){
  let reads=[];
  const prisma={
    chiefComplaintCatalog:{findMany:async()=>{reads.push('complaints');return []}},
    diseaseCatalog:{findMany:async()=>{reads.push('diseases');return []}},
    clinicServiceSetting:{findMany:async()=>{reads.push('services');return [{type:'MEDICINES',isActive:false}]}},
  };
  const services=load('src/lib/service-settings.ts',{
    '@/lib/prisma':{prisma},'@/lib/clinic-services':{requestTypeLabels:{MEDICINES:'Provision of Medicine'}},
  });
  const options=await services.clinicServiceOptions('clinic-a',['MEDICINES']);
  assert.equal(options.find(o=>o.value==='MEDICINES').isActive,false);
  assert.ok(!options.filter(o=>o.isActive).some(o=>o.value==='MEDICINES'),'Inactive services must stay out of new visits');
  assert.equal(reads.length,1,'One lookup must supply both existing and new visit options');
  reads=[];
  await services.requireAvailableServices('clinic-a',['MEDICINES'],['MEDICINES']);
  assert.deepEqual(reads,[],'Existing services must not trigger redundant availability lookups');
  await assert.rejects(services.requireAvailableServices('clinic-a',['MEDICINES']),/inactive/);
  const {default:Settings}=load('src/app/settings/page.tsx',{
    '@/lib/prisma':{prisma},
    '@/lib/auth':{getCurrentUser:async()=>({role:'ADMIN',clinicId:'clinic-a'})},
    '@/lib/patient-view':{getClinicSettingsData:async()=>{reads.push('general');return {clinic:{},users:[]}}},
    'next/navigation':{redirect:()=>{throw Error('Unauthorized')}},
  });
  function findTabs(node){
    if(!node||typeof node!=='object') return null;
    if(node.props?.tabs) return node.props.tabs;
    for(const child of [].concat(node.props?.children||[])){const result=findTabs(child);if(result)return result;}
    return null;
  }
  for(const tab of ['general','complaints','diseases','archives','services']){
    reads=[];
    const tabs=findTabs(await Settings({searchParams:Promise.resolve({tab})}));
    assert.deepEqual(reads,['general','complaints','diseases'].includes(tab)?[tab]:[],`Only selected Settings data should load: ${tab}`);
    for(const key of ['archives','services']) assert.equal(Boolean(tabs.find(t=>t.id===key).content),key===tab,`Hidden ${key} must not trigger server rendering`);
    assert.ok(tabs.every(t=>t.href),'Settings tabs must navigate to load the selected data');
  }
  console.log('PASS: single service lookup, inactive choices preserved only for existing visits, redundant validation queries skipped, Settings data loads only for selected tab.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
