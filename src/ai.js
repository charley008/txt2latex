import {cleanLatex,systemPrompt} from '../server/latex.js';
import {localSystemPrompt,localExamples,localRequest} from './local-prompt.js';
import {translateForLocal} from './translate.js';
const defaults={baseUrl:'https://api.deepseek.com',model:'deepseek-v4-flash',apiKey:'',remember:false};
export function readSettings(){try{const d=JSON.parse(localStorage.getItem('formula-ai-settings')||'{}');return {...defaults,baseUrl:typeof d.baseUrl==='string'?d.baseUrl:defaults.baseUrl,model:typeof d.model==='string'?d.model:defaults.model,apiKey:d.remember===true&&typeof d.apiKey==='string'?d.apiKey:'',remember:d.remember===true}}catch{return {...defaults}}}
export function saveSettings(settings){localStorage.setItem('formula-ai-settings',JSON.stringify({...settings,apiKey:settings.remember?settings.apiKey:''}));}
export async function getLocalStatus(){
 if(!globalThis.isSecureContext)return '本地 AI 需要 HTTPS 或 localhost';
 if(!globalThis.LanguageModel)return '当前浏览器不支持，请使用支持 Prompt API 的桌面 Chrome 或选择云端 API';
 try{const a=await LanguageModel.availability();return {available:'本地模型已就绪 · 中文效果需核对',downloadable:'Chrome 报告需下载模型资源 · 点击生成开始',downloading:'本地模型正在下载',unavailable:'Chrome 报告模型暂不可用（unavailable），请检查浏览器版本、模型状态与运行条件'}[a]||'本地 AI 状态未知'}catch{return '无法检测本地模型，可选择云端 API'}
}
export async function convertLocal(text,preferences,onProgress=()=>{},onTranslation=()=>{}){
 if(!globalThis.isSecureContext||!globalThis.LanguageModel)throw Error('本地 AI 不可用：请使用 HTTPS/localhost 和支持 Prompt API 的桌面 Chrome，或手动选择「我的云端 API」。');
 const state=await LanguageModel.availability();
 if(state==='unavailable')throw Error('Chrome 返回 unavailable，暂时不能创建本地模型会话。这不一定是硬件不足：请在桌面 Chrome 打开 chrome://on-device-internals 查看模型状态，并确认浏览器版本及磁盘空间。也可手动选择「我的云端 API」。');
 let session;
 try{
  const translated=await translateForLocal(text,preferences,onProgress);
  onTranslation(translated.text===text&&translated.preferences===preferences?null:translated);
  onProgress(state==='available'?'正在加载已下载的本地模型…':'正在准备本地模型资源…');
  session=await LanguageModel.create({initialPrompts:[{role:'system',content:localSystemPrompt},...localExamples],monitor(m){m.addEventListener('downloadprogress',e=>{if(state!=='available' && e.loaded<1)onProgress(`正在下载本地模型资源 ${Math.round(e.loaded*100)}%`);else onProgress('正在加载本地模型…')})}});
  onProgress('正在使用本地模型转换…');
  return cleanLatex(await session.prompt(localRequest(translated.text,translated.preferences)));
 }catch(e){throw Error(`本地 AI 转换失败：${e.message}。可手动选择云端 API；未自动上传输入。`)}finally{session?.destroy()}
}
export async function convertCloud({text,preferences='',baseUrl,model,apiKey}){
 if(!apiKey.trim())throw Error('请在接口设置中填写你自己的 API Key。');
 if(!model.trim())throw Error('请填写模型名称。');
 let url;try{url=new URL(baseUrl)}catch{throw Error('API 地址无效。')}
 if(url.username||url.password||url.search||url.hash)throw Error('API 地址不能包含用户名、密码、查询参数或片段。');
 if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('云端接口必须使用 HTTPS，本机接口可使用 HTTP。');
 try{
  const r=await fetch(`${url.href.replace(/\/+$/,'')}/chat/completions`,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey.trim()}`},body:JSON.stringify({model:model.trim(),messages:[{role:'system',content:systemPrompt},{role:'user',content:JSON.stringify({description:text,formattingPreferences:preferences})}],stream:false,max_tokens:4096}),signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error(r.status===401||r.status===403?'认证失败，请检查自己的 API Key。':r.status===429?'接口限流或余额不足。':`AI 接口返回 HTTP ${r.status}，请检查模型和接口地址。`);
  const d=await r.json();if(typeof d.choices?.[0]?.message?.content!=='string')throw Error('接口响应缺少公式内容。');return cleanLatex(d.choices[0].message.content);
 }catch(e){if(e.name==='TimeoutError')throw Error('AI 请求超时，请重试。');if(e instanceof TypeError)throw Error('无法直接连接 AI 接口：请检查网络、地址及提供商是否允许浏览器跨域（CORS）。本站不会中转密钥。');throw e}
}
