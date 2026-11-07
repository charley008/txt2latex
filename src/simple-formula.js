// Match complete, unambiguous descriptions only. Never rewrite arbitrary AI output.
export function simpleFormula(text,preferences=''){
 if(preferences.trim())return null;
 const input=text.trim().replace(/[。.!！]$/,'').trim();let m;
 if((m=input.match(/^(?:三角形|triangle)\s*([A-Za-z])\s*([A-Za-z])\s*([A-Za-z])$/i)))return `\\triangle ${m[1]}${m[2]}${m[3]}`;
 if((m=input.match(/^(?:角|angle)\s*([A-Za-z]{1,3})(?:\s*(?:等于|=)\s*(-?\d+(?:\.\d+)?)\s*(?:度|°))?$/i)))return `\\angle ${m[1]}${m[2]===undefined?'':` = ${m[2]}^\\circ`}`;
 return null;
}
