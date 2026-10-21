import{ApiError}from'./errors.js';
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function periodKey(value:string):number|null{
  const t=value.trim().toLowerCase();let m:RegExpMatchArray|null;
  if((m=t.match(/^(\d{4})$/)))return Number(m[1])*12;
  if((m=t.match(/^(\d{4})[ -]?q([1-4])$/)))return Number(m[1])*12+(Number(m[2])-1)*3;
  if((m=t.match(/^q([1-4])[ -]?(\d{4})$/)))return Number(m[2])*12+(Number(m[1])-1)*3;
  if((m=t.match(/^(\d{4})[- ](0[1-9]|1[0-2])$/)))return Number(m[1])*12+Number(m[2])-1;
  if((m=t.match(/^(\d{4})\s+([a-z]{3})$/))&&months.includes(m[2]))return Number(m[1])*12+months.indexOf(m[2]);
  if((m=t.match(/^([a-z]{3})\s+(\d{4})$/))&&months.includes(m[1]))return Number(m[2])*12+months.indexOf(m[1]);
  return null;
}
export function periodBounds(from?:string,to?:string){const lower=from?periodKey(from):null,upper=to?periodKey(to):null;if(from&&lower===null||to&&upper===null||lower!==null&&upper!==null&&lower>upper)throw new ApiError('Invalid period range. Use YYYY, YYYY Qn or YYYY-MM.',400,undefined,'INVALID_ARGUMENT');return{lower,upper};}
