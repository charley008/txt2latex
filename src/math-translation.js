// Protect only explicit atoms/phrases; do not guess the scope of natural-language sums.
export function protectMath(source){
 const terms={'二重积分':'double integral','定积分':'definite integral','积分':'integral','一阶导数':'first derivative','二阶偏导数':'second partial derivative','平方根':'square root','原函数':'antiderivative'};
 let prefix='ZXQMATH';while(source.toUpperCase().includes(prefix))prefix+='X';
 const values=[];
 const pattern=/[A-Za-z]\s*的\s*负\s*([A-Za-z]|\d+)\s*次方|[A-Za-z]\s*下标\s*[A-Za-z](?:\s*[A-Za-z])*|[A-Za-z]\s*的\s*(?:平方|三次方)|二阶偏导数|一阶导数|二重积分|定积分|平方根|原函数|积分|[A-Za-z]+(?:\([^()\n]*\))?/g;
 const text=source.replace(pattern,part=>{
  let value=terms[part];
  if(!value){let m;
   if((m=part.match(/^([A-Za-z])\s*的\s*负\s*([A-Za-z]|\d+)\s*次方$/)))value=`${m[1]}^{-${m[2]}}`;
   else if((m=part.match(/^([A-Za-z])\s*下标\s*([A-Za-z](?:\s*[A-Za-z])*)$/)))value=`${m[1]}_{${m[2].replace(/\s/g,'')}}`;
   else if((m=part.match(/^([A-Za-z])\s*的\s*(平方|三次方)$/)))value=`${m[1]}^{${m[2]==='平方'?2:3}}`;
   else value=part;
  }
  const marker=`${prefix}${values.length}QXZ`;values.push(value);return marker;
 });
 return {text,restore(translated){
  let result=translated;
  values.forEach((value,i)=>{const token=new RegExp(`${prefix}\\s*${i}\\s*QXZ`,'gi');const matches=result.match(token);if(matches?.length!==1)throw Error('本地翻译遗漏或改写了受保护的数学符号，请重试、输入英文或选择云端 API。');result=result.replace(token,()=>` ${value} `)});
  return result;
 }};
}
