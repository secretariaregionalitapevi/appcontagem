const fs=require('fs');
const globals=fs.readFileSync('backend-separado/00_Globals.gs','utf8');
const url=globals.match(/SUPABASE_URL = '([^']+)'/)[1];
const key=globals.match(/SUPABASE_ANON_KEY = '([^']+)'/)[1];
const dir='scratch/sam-2026-11-12';
async function readCadastro(){
 const all=[];
 for(let offset=0;;offset+=1000){
  const response=await fetch(`${url}/rest/v1/cadastro?select=*&order=id&offset=${offset}&limit=1000`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Read failed: ${response.status}`);
  const page=await response.json();all.push(...page);if(page.length<1000)break;
 }
 return all;
}
if(require.main===module)(async()=>{
 fs.mkdirSync(dir,{recursive:true});const rows=await readCadastro();
 const target=`${dir}/${process.argv[2]||'before.json'}`;
 fs.writeFileSync(target,JSON.stringify(rows,null,2),{flag:'wx'});
 console.log(JSON.stringify({rows:rows.length,columns:Object.keys(rows[0]||{}),target}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={readCadastro,url,key,dir};
