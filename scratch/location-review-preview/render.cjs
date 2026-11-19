
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript');
const React=require('react'),web=require('react-native-web'),server=require('react-dom/server');
const root=process.cwd(),width=Number(process.argv[2]||1100),height=Number(process.argv[3]||900);
const venues=[{id:'2',nome:'Caucaia do Alto',geo:{latitude:-23.6824552,longitude:-47.0214911}},{id:'4',nome:'Itapevi',geo:{latitude:-23.5457193,longitude:-46.9280331}}];
const assessment={selected:venues[1],date:'2026-11-19',geo:{status:'mismatch',distance:17900,suggested:venues[0]},position:{...venues[0].geo,accuracy:30,timestamp:Date.now()},outsideMonth:true,checkedAt:Date.now()};
const glyphs=require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome5Free.json');
const icon=({name,size,color})=>React.createElement('span',{style:{fontFamily:'Awesome',fontWeight:900,fontSize:size,color,lineHeight:1}},String.fromCharCode(glyphs[name]||glyphs['map-marker-alt']));
const original=Module._load;
Module._load=function(request,parent,main){
 if(request==='react-native')return {...web,Image:({source,style})=>React.createElement(web.View,{style},React.createElement('img',{src:source.uri,style:{width:'100%',height:'100%'}})),Modal:({children})=>React.createElement('div',null,children),SafeAreaView:web.View,useWindowDimensions:()=>({width,height})};
 if(request==='@expo/vector-icons')return {FontAwesome5:icon};
 if(request.endsWith('/services/locationReview'))return {attachLocationReview:()=>()=>{},finishLocationReview:()=>{}};
 if(request.endsWith('/services/locationSafetyService'))return {locationSafetyService:{subscribe:()=>()=>{},resolve:id=>venues.find(v=>v.id===id),snapshot:()=>assessment}};
 if(request.endsWith('/config/ensaioVenues'))return {getEnsaioVenues:()=>venues};
 return original.apply(this,arguments);
};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,filename);
const realState=React.useState;let calls=0;
React.useState=initial=>{const index=calls++;return realState(index===0?{assessment,automatic:true}:index===1?'2':initial===360?Math.min(width < 600 ? width - 32 : width - 48,500) - (width < 600 ? 30 : 38):initial);};
const {LocationReviewHost}=require(path.join(root,'src/components/LocationReviewHost.tsx'));
const markup=server.renderToStaticMarkup(React.createElement(LocationReviewHost));
const css=web.StyleSheet.getSheet().textContent;
const font=fs.readFileSync(path.join(root,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf')).toString('base64');
fs.writeFileSync(path.join(__dirname,`preview-${width}.html`),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:Awesome;src:url(data:font/ttf;base64,${font})}html,body,#root{margin:0;height:100%;font-family:Inter,Arial,sans-serif}#root{display:flex;width:${width}px;height:${height}px}#root>div{display:flex;flex:1}${css}</style></head><body><div id="root">${markup}</div></body></html>`);
console.log('Preview renderizado:',width);
