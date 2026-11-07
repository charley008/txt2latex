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
