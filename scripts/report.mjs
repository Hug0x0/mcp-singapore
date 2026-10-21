export function buildReport(mode,results,now=new Date().toISOString()){
 const counts={pass:0,fail:0,skipped:0,pending:0};for(const r of results){if(!(r.status in counts))throw Error('Unknown verification status');counts[r.status]++;}
 return{tested_at:now,mode,summary:counts,results,untested:results.filter(r=>r.status==='skipped').map(r=>({tool:r.tool,reason:r.reason})),incomplete:results.filter(r=>r.status==='pending').map(r=>r.tool)};
}
