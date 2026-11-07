import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/index.js';
import {cleanLatex} from '../server/latex.js';
import {convertCloud,convertLocal,saveSettings,readSettings} from '../src/ai.js';
test('cleans delimiters',()=>assert.equal(cleanLatex('$\\triangle ABC$'),'\\triangle ABC'));
test('server has no shared AI endpoints even when legacy env is set',async()=>{
 process.env.AI_API_KEY='never-share';const server=createApp().listen(0);await new Promise(r=>server.once('listening',r));
 try{for(const path of ['/api/config','/api/convert']){const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`);assert.equal(r.status,404);assert.ok(!(await r.text()).includes('never-share'))}}finally{delete process.env.AI_API_KEY;await new Promise(r=>server.close(r))}
});
test('browser keys are opt-in and cloud calls go directly to selected provider',async()=>{
 let stored;globalThis.localStorage={getItem:()=>stored,setItem:(k,v)=>stored=v};
 saveSettings({baseUrl:'https://api.deepseek.com',model:'deepseek-v4-flash',apiKey:'private-key',remember:false});assert.ok(!stored.includes('private-key'));assert.equal(readSettings().apiKey,'');
 saveSettings({apiKey:'private-key',remember:true});assert.equal(readSettings().apiKey,'private-key');
 const original=globalThis.fetch;globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(opts.headers.Authorization,'Bearer own-key');return Response.json({choices:[{message:{content:'$x^2$'}}]})};
 try{assert.equal(await convertCloud({text:'x平方',baseUrl:'https://api.deepseek.com',model:'deepseek-v4-flash',apiKey:'own-key'}),'x^2');await assert.rejects(()=>convertCloud({apiKey:'',model:'x'}),/自己的/)}finally{globalThis.fetch=original;delete globalThis.localStorage}
});
test('local model lifecycle and unsupported device',async()=>{
 globalThis.isSecureContext=true;let destroyed=false;globalThis.LanguageModel={availability:async()=> 'available',create:async()=>({prompt:async()=> '$x$',destroy:()=>{destroyed=true}})};
 try{assert.equal(await convertLocal('x',''),'x');assert.equal(destroyed,true);LanguageModel.availability=async()=> 'unavailable';await assert.rejects(()=>convertLocal('x',''),/unavailable/)}finally{delete globalThis.LanguageModel;delete globalThis.isSecureContext}
});

test('removes unsolicited numbered equation wrapper',()=>{assert.equal(cleanLatex(String.raw`\begin{equation}
x^2+y^2=1
\end{equation}`),'x^2+y^2=1')});

test('ready model initialization is not labeled as downloading',async()=>{
 globalThis.isSecureContext=true;globalThis.LanguageModel={availability:async()=> 'available',create:async(opts)=>{opts.monitor({addEventListener:(name,cb)=>cb({loaded:1})});return {prompt:async()=> 'x',destroy(){}}}};
 try{const progress=[];await convertLocal('x','',p=>progress.push(p));assert.ok(progress.length>0);assert.ok(progress.every(p=>!p.includes('正在下载')))}finally{delete globalThis.LanguageModel;delete globalThis.isSecureContext}
});

test('Chinese is translated locally before generation; English bypasses translation',async()=>{
 const {translateForLocal}=await import('../src/translate.js');let destroyed=false;const calls=[];
 globalThis.Translator={availability:async(o)=>{assert.equal(o.sourceLanguage,'zh');return 'available'},create:async()=>({translate:async(t)=>{calls.push(t);return 'English: '+t},destroy(){destroyed=true}})};
 try{assert.deepEqual(await translateForLocal('中文','要求'),{text:'English: 中文',preferences:'English: 要求'});assert.deepEqual(calls,['中文','要求']);assert.equal(destroyed,true);calls.length=0;assert.deepEqual(await translateForLocal('x equals 1',''),{text:'x equals 1',preferences:''});assert.equal(calls.length,0);delete globalThis.Translator;await assert.rejects(()=>translateForLocal('中文',''),/内置翻译/)}finally{delete globalThis.Translator}
});

test('protects mathematical case, coefficients, exponential bases and integral terminology',async()=>{
 const {protectMath}=await import('../src/math-translation.js');
 const p=protectMath('定义 Q，每项 a 下标 i j，F(x) 等于定积分，t 的平方乘以 e 的负 t 次方');
 const restored=p.restore(p.text.toLowerCase());
 assert.ok(restored.includes(' Q '));assert.ok(restored.includes(' F(x) '));assert.ok(restored.includes('definite integral'));assert.ok(restored.includes('t^{2}'));assert.ok(restored.includes('e^{-t}'));
 const q=protectMath('Q与a下标ij');assert.ok(q.restore(q.text).includes('a_{ij}'));assert.throws(()=>q.restore('lost symbols'),/遗漏/);
});

test('normalizes separate Markdown formulas and unwrapped aligned rows',async()=>{
 const {default:katex}=await import('katex');
 const inputs=[String.raw`$F(x) = \int_0^x t^2 e^{-t} dt$
$F'(x) = x^2 e^{-x}$`,String.raw`F(x)&=x^2\\F'(x)&=2x`];
 for(const input of inputs){const result=cleanLatex(input);assert.ok(result.includes('\\begin{aligned}'));assert.ok(!result.includes('$'));assert.doesNotThrow(()=>katex.renderToString(result,{throwOnError:true}))}
 const literal=String.raw`\text{cost: \$5}`;assert.equal(cleanLatex(literal),literal);
 const matrix=String.raw`\begin{bmatrix}1&2\\3&4\end{bmatrix}`;assert.equal(cleanLatex(matrix),matrix);
});

test('invalid local LaTeX receives one syntax repair attempt',async()=>{
 let prompts=0,destroyed=false;globalThis.isSecureContext=true;
 globalThis.LanguageModel={availability:async()=> 'available',create:async()=>({prompt:async()=>++prompts===1?String.raw`\frac{x}{`:String.raw`\frac{x}{2}`,destroy(){destroyed=true}})};
 try{assert.equal(await convertLocal('x divided by 2',''),String.raw`\frac{x}{2}`);assert.equal(prompts,2);assert.equal(destroyed,true)}finally{delete globalThis.LanguageModel;delete globalThis.isSecureContext}
});

test('connection test supports full endpoints and reports authentication failure',async()=>{
 const {testCloudConnection}=await import('../src/ai.js');const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.deepseek.com/v1/chat/completions');assert.equal(JSON.parse(opts.body).max_tokens,32);return Response.json({choices:[{message:{content:'x=1'}}]})};
  assert.match(await testCloudConnection({baseUrl:' https://api.deepseek.com/v1/chat/completions/ ',model:'test',apiKey:'own-key'}),/连接成功/);
  globalThis.fetch=async()=>new Response('',{status:401});await assert.rejects(()=>testCloudConnection({baseUrl:'https://api.deepseek.com',model:'test',apiKey:'bad'}),/认证失败/);
 }finally{globalThis.fetch=original}
});
