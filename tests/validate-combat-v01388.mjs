import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=name=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const net=read("public/combat-multiplayer.js"),combat=read("public/plant-combat.js");
const server=read("app/api/combat-lobby/route.ts"),css=read("app/globals.css");
const extract=(source,name)=>{
  const from=source.indexOf("function "+name+"(");
  assert.ok(from>=0,"Missing function "+name);
  const open=source.indexOf("{",from);let depth=0,end=0;
  for(let i=open;i<source.length;i++){if(source[i]==="{")depth++;if(source[i]==="}"&&!--depth){end=i+1;break;}}
  return vm.runInNewContext("("+source.slice(from,end)+")",{});
};
const fresh=extract(net,"acceptLobbySnapshot");
assert.equal(fresh({code:"A",syncSeq:12},{code:"A",syncSeq:11}),false,
  "Stale heartbeat/event responses must never rewind game state");
assert.equal(fresh({code:"A",syncSeq:12},{code:"A",syncSeq:13}),true);
assert.equal(fresh({code:"A",syncSeq:12},{code:"B",syncSeq:1}),true);
assert.ok(net.includes("const seenEventIds=new Set()") &&
  net.includes("seenEventIds.add(event.id)"),"Events must not replay after an older HTTP response");
assert.ok(net.includes("sendPause("),"Client must expose an immediate shared pause action");
assert.ok(server.includes("syncSeq") && server.includes("pausedBy") &&
  server.includes('action === "pause"'),"Pause and transport revisions must be authoritative at the server");
assert.ok(server.includes('if (action === "event")') &&
  server.includes("scheduleDeferredPersist(store)"),"Frequent combat events must not fsync on every shot");
assert.ok(combat.includes("multiplayer.sendPause(") &&
  combat.includes("applySharedPause("),"Co-op clients must exchange and apply a shared pause state");
assert.ok(combat.includes("pauseOverlay.dataset.combatSharedPaused") &&
  combat.includes("PAUSED BY"),"Other players must see who paused the match");
assert.ok(combat.includes("worldSeq<=lastAppliedHostWorldSeq"),
  "Out-of-order enemy snapshots cannot rewind follower positions");
assert.ok(combat.includes("lastAppliedHostWorldSeq<0") &&
  combat.includes("syncEnemies(false)"),"Follower must avoid full base-enemy rebuild on every snapshot");
assert.ok(css.includes(".combat-pause-overlay[data-combat-shared-paused"),
  "Shared pause notice needs explicit UI styling");
console.log("v0.13.88 checks passed: ordered snapshots, co-op pause, event efficiency and enemy reconciliation.");
