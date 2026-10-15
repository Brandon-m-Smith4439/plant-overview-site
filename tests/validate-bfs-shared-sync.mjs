import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../public/shared-workspace.js",import.meta.url),"utf8");
const api=fs.readFileSync(new URL("../app/api/shared-workspace/route.ts",import.meta.url),"utf8");
assert.ok(api.includes("requestHasEditorSession(request)"),"Verified BFS editors must be able to publish.");
assert.ok(source.includes('return { source: "local-newer", applied: false }'),"Failed publish must never discard newer local changes.");
const key="monroe-glass-plant-layout-v6";
const newer=JSON.stringify({version:6,updatedAt:"2026-10-15T13:29:00.000Z",machines:[{id:"updated-layout",x:321}],processPointers:{a:"b"},processConnections:{"a->b":{width:5}}});
const older=JSON.stringify({version:6,updatedAt:"2026-10-13T13:29:00.000Z",machines:[{id:"old-layout",x:0}]});
const remote={updatedAt:"2026-10-13T13:30:00.000Z",payload:{kind:"monroe-glass-plant-workspace",version:1,items:{[key]:older}}};
async function load(authorized,serverAccepts) {
  const store=new Map([[key,newer]]),requests=[];
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
  const window={location:{origin:"https://bfs.example"},monroeEditorAccess:{hasAccess:()=>authorized,isOwner:()=>false},setTimeout(){},clearTimeout(){}};
  const fetch=async(url,options={})=>{
    requests.push({url,method:options.method||"GET"});
    if(options.method==="PUT") {
      if(!serverAccepts)return {status:401,ok:false};
      const payload=JSON.parse(options.body).payload;
      return {ok:true,json:async()=>({workspace:{updatedAt:"2026-10-15T13:30:00.000Z",payload}})};
    }
    return {ok:true,json:async()=>({workspace:remote})};
  };
  vm.runInNewContext(source,{window,localStorage,fetch,Date,console,CustomEvent:class {}},{timeout:1500});
  const outcome=await window.PLANT_SHARED_WORKSPACE_READY;
  return {store,requests,outcome};
}
const unauth=await load(false,false);
assert.equal(JSON.parse(unauth.store.get(key)).machines[0].id,"updated-layout");
assert.equal(unauth.outcome.source,"local-newer","Old remote must never win over newer local data without authentication.");
assert.equal(unauth.requests.filter(x=>x.method==="PUT").length,0);
const offline=await load(true,false);
assert.equal(offline.outcome.source,"local-newer","Authentication failure cannot cause a destructive rollback.");
assert.equal(JSON.parse(offline.store.get(key)).processConnections["a->b"].width,5);
const authorized=await load(true,true);
assert.equal(authorized.outcome.source,"local-published");
assert.equal(authorized.requests.filter(x=>x.method==="PUT").length,1);
assert.equal(authorized.store.get(key),newer);
console.log("BFS local-newer recovery, authenticated editor publish, and failed-save no-overwrite checks passed.");
