export function parseNumber(value:unknown):number|null{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string')return null;const text=value.trim();
  if(!/^[+-]?(?:\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(text))return null;
  const n=Number(text.replace(/,/g,''));return Number.isFinite(n)?n:null;
}
export function staleWarning(updated:unknown,days:number,now=Date.now()):string[]{
  if(typeof updated!=='string'||!Number.isFinite(Date.parse(updated)))return['Source update date is unknown; publication age cannot be assessed.'];
  return now-Date.parse(updated)>days*86400000?[`Source publication is older than ${days} days. Coverage and observation dates must be checked separately.`]:[];
}
export function quantile(sorted:number[],p:number):number|null{if(!sorted.length)return null;const index=(sorted.length-1)*p,lower=Math.floor(index);return sorted[lower]+(sorted[Math.ceil(index)]-sorted[lower])*(index-lower);}
