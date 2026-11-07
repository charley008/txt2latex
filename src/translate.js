export const hasChinese=text=>/\p{Script=Han}/u.test(text);
export async function translateForLocal(text,preferences,onProgress=()=>{}){
 if(!hasChinese(text)&&!hasChinese(preferences))return {text,preferences};
 if(!globalThis.Translator)throw Error('此浏览器未提供内置翻译，请使用支持 Translator API 的桌面 Chrome，或输入英文。');
 const options={sourceLanguage:'zh',targetLanguage:'en'};
 const availability=await Translator.availability(options);
 if(availability==='unavailable')throw Error('浏览器暂不支持中文到英文的本地翻译，请输入英文或手动选择云端 API。');
 let translator;
 try{
  onProgress('正在准备本地中英翻译…');
  translator=await Translator.create({...options,monitor(m){m.addEventListener('downloadprogress',e=>onProgress(e.loaded<1?`正在准备翻译资源 ${Math.round(e.loaded*100)}%`:'正在加载本地翻译…'))}});
  onProgress('正在本机将中文翻译为英文…');
  const result={text:hasChinese(text)?await translator.translate(text):text,preferences:hasChinese(preferences)?await translator.translate(preferences):preferences};
  if(!result.text.trim()||(preferences.trim()&&!result.preferences.trim()))throw Error('本地翻译返回空内容，请重试。');
  return result;
 }finally{translator?.destroy()}
}
