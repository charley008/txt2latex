import express from 'express';
import {pathToFileURL,fileURLToPath} from 'node:url';
export function createApp(){
 const app=express();app.disable('x-powered-by');
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next()});
 app.get('/api/health',(_,res)=>res.json({ok:true}));
 app.use('/api',(_,res)=>res.status(404).json({error:'本站不提供 AI 代理。'}));
 app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));return app;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createApp().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Formula Studio listening on :3000'));
