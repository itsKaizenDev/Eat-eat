import { Worker } from 'node:worker_threads';
// Read-only compiled modules are prepared once by env.mjs in the parent.
// Every worker owns its world, RNG and module state; workers never delete cache.
export function createCampaignJobs(cases, cacheRoot) {
  let jobs;
  function patterns(flag) {
    const values=[];
    for(let i=0;i<process.execArgv.length;i++) {
      const a=process.execArgv[i];
      if(a===flag) values.push(new RegExp(process.execArgv[++i]));
      else if(a.startsWith(flag+'=')) values.push(new RegExp(a.slice(flag.length+1)));
    }
    return values;
  }
  function start(requested) {
    const include=patterns('--test-name-pattern'),skip=patterns('--test-skip-pattern');
    const selected=cases.filter(c=>(!include.length||include.some(p=>p.test(c.name)))&&!skip.some(p=>p.test(c.name)));
    if(!selected.some(c=>c.id===requested.id)) selected.push(requested);
    const queue=[],workers=new Set(),resolvers=new Map();jobs=new Map();
    for(const c of selected) { jobs.set(c.id,new Promise(resolve=>resolvers.set(c.id,resolve)));queue.push(c); }
    const fail = error => {
      for(const [id,resolve] of resolvers) resolve({id,ok:false,error:String(error.stack||error)});
      resolvers.clear();queue.length=0;for(const w of workers)w.terminate();workers.clear();
    };
    const next = w => { if(queue.length)w.postMessage(queue.shift());else {workers.delete(w);w.terminate();} };
    for(let i=0;i<Math.min(4,selected.length);i++) {
      const w=new Worker(new URL('./campaign-worker.mjs',import.meta.url),{workerData:{cacheRoot},execArgv:[]});workers.add(w);
      w.on('message',result=>{resolvers.get(result.id)?.(result);resolvers.delete(result.id);next(w);});
      w.on('error',fail);w.on('exit',code=>{if(workers.has(w))fail(new Error('Campaign worker exited early: '+code));});next(w);
    }
  }
  return task => { if(!jobs)start(task);return jobs.get(task.id); };
}
