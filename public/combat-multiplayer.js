(() => {
  "use strict";

  const API = "/api/combat-lobby";
  const CLIENT_KEY = "monroe-glass-combat-player-v1";
  const NAME_KEY = "monroe-glass-combat-player-name-v1";
  // Fast enough for interpolation, while reducing server JSON and file load.
  const REMOTE_STATE_INTERVAL_MS = 125;
  const clean = (value, max = 48) => String(value || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);

  function acceptLobbySnapshot(current,next) {
    if(!current || current.code!==next?.code)return true;
    return (Number(next?.syncSeq)||0)>=(Number(current.syncSeq)||0);
  }

  function playerId() {
    try {
      const existing = sessionStorage.getItem(CLIENT_KEY);
      if (existing) return existing;
      const created = (window.crypto?.randomUUID?.() || `player-${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 96);
      sessionStorage.setItem(CLIENT_KEY, created);
      return created;
    } catch { return `player-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  }

  async function request(method, body, code = "") {
    const response = await fetch(code && method === "GET" ? `${API}?code=${encodeURIComponent(code)}` : API, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: method === "POST" ? { "content-type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body || {}) : undefined,
    });
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok || payload?.ok === false) {
      const error = new Error(payload?.error || `Lobby request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.createCombatMultiplayer = function createCombatMultiplayer(options = {}) {
    const id = playerId();
    let lobby = null;
    let heartbeatTimer = 0;
    let heartbeatBusy = false;
    let lastHeartbeatAt = 0;
    const seenEventIds=new Set();
    let lastStatus = "";
    let rttMs=0;
    let destroyed = false;

    const emit = () => {
      options.onUpdate?.(lobby);
      window.dispatchEvent(new CustomEvent("combatmultiplayerupdate", { detail: { lobby, playerId: id } }));
    };

    const localPlayer = () => (lobby?.players || []).find((player) => player.id === id) || null;
    const isHost = () => Boolean(lobby && lobby.hostId === id);
    const remotePlayers = () => (lobby?.players || []).filter((player) => player.id !== id);

    const processLobby = (next) => {
      if (!next || !acceptLobbySnapshot(lobby,next)) return;
      const previousStatus = lastStatus;
      lobby = next;
      lastStatus = lobby.status || "";
      const events = Array.isArray(lobby.events) ? lobby.events : [];
      for (const event of events) {
        if(seenEventIds.has(event.id))continue;
        seenEventIds.add(event.id);
        if(event.senderId!==id) options.onEvent?.(event,lobby);
      }
      // Keep an event window wider than the server's rolling event queue.
      if(seenEventIds.size>500) {
        const recent=[...seenEventIds].slice(-250);
        seenEventIds.clear();recent.forEach(eventId=>seenEventIds.add(eventId));
      }
      emit();
      if (previousStatus && previousStatus !== lastStatus) options.onStatusChange?.(lastStatus, lobby);
    };

    async function authenticate(password) {
      const value = clean(password, 160);
      if (!value) {
        await request("GET", null);
        return true;
      }
      const response = await fetch("/api/editor-session", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ password:value }),
      });
      if (!response.ok) throw new Error("Owner password is not correct.");
      return true;
    }

    function storedName() {
      try { return clean(localStorage.getItem(NAME_KEY), 32); } catch { return ""; }
    }
    function saveName(value) {
      try { localStorage.setItem(NAME_KEY, clean(value, 32)); } catch {}
    }

    async function create(config, player) {
      const name = clean(player?.name || storedName() || "Player", 32) || "Player";
      saveName(name);
      const payload = await request("POST", { action:"create", playerId:id, name, characterId:player?.characterId || "", config });
      processLobby(payload.lobby);
      startHeartbeat();
      return lobby;
    }

    async function join(code, player) {
      const name = clean(player?.name || storedName() || "Player", 32) || "Player";
      saveName(name);
      const payload = await request("POST", { action:"join", code:clean(code,8).toUpperCase(), playerId:id, name, characterId:player?.characterId || "" });
      processLobby(payload.lobby);
      startHeartbeat();
      return lobby;
    }

    async function configure(config) {
      if (!lobby) return null;
      const payload = await request("POST", { action:"configure", code:lobby.code, playerId:id, config });
      processLobby(payload.lobby);
      return lobby;
    }

    async function ready(value = true, player = {}) {
      if (!lobby) return null;
      const payload = await request("POST", {
        action:"heartbeat", code:lobby.code, playerId:id, ready:Boolean(value),
        name:player.name || localPlayer()?.name, characterId:player.characterId || localPlayer()?.characterId,
        state:options.getState?.() || localPlayer()?.state || {},
      });
      processLobby(payload.lobby);
      return lobby;
    }

    async function startMatch() {
      if (!lobby) return null;
      const payload = await request("POST", { action:"start", code:lobby.code, playerId:id });
      processLobby(payload.lobby);
      return lobby;
    }

    async function resetMatch() {
      if (!lobby) return null;
      const payload = await request("POST", { action:"reset", code:lobby.code, playerId:id });
      processLobby(payload.lobby);
      return lobby;
    }

    async function sendEvent(type, payload = {}, targetId = "") {
      if (!lobby) return null;
      // A shot/event acknowledgement carries no heavyweight world snapshot.
      const response = await request("POST", { action:"event", code:lobby.code, playerId:id, type, targetId, payload });
      if(response.lobby)processLobby(response.lobby);
      return response.event;
    }
    async function endCoopRound(leaderboard=[]) {
      if(!lobby)return null;
      const response=await request("POST",{
        action:"game-over",code:lobby.code,playerId:id,leaderboard
      });
      processLobby(response.lobby);
      return response.lobby;
    }
    async function voteRematch(vote=true) {
      if(!lobby)return null;
      const response=await request("POST",{
        action:"rematch-vote",code:lobby.code,playerId:id,vote:Boolean(vote)
      });
      processLobby(response.lobby);
      return response.lobby;
    }
    async function sendPause(paused) {
      if(!lobby)return null;
      const payload=await request("POST",{
        action:"pause",code:lobby.code,playerId:id,paused:Boolean(paused)
      });
      processLobby(payload.lobby);
      return payload.lobby;
    }

    async function heartbeat() {
      if (!lobby || heartbeatBusy || destroyed) return;
      const now = performance.now();
      if (now - lastHeartbeatAt < REMOTE_STATE_INTERVAL_MS) return;
      lastHeartbeatAt = now;
      heartbeatBusy = true;
      const startedAt=performance.now();
      try {
        const local = localPlayer();
        const state = options.getState?.() || local?.state || {};
        const payload = await request("POST", {
          action:"heartbeat", code:lobby.code, playerId:id,
          name:local?.name || storedName() || "Player", characterId:local?.characterId || "",
          ready:Boolean(local?.ready), state,
        });
        rttMs=rttMs? rttMs*.76+(performance.now()-startedAt)*.24 :
          performance.now()-startedAt;
        processLobby(payload.lobby);
      } catch (error) {
        options.onError?.(error);
        if (error?.status === 404 || error?.status === 403) { lobby = null; stopHeartbeat(); emit(); }
      } finally { heartbeatBusy = false; }
    }

    function startHeartbeat() {
      if (heartbeatTimer) return;
      heartbeatTimer = window.setInterval(heartbeat, REMOTE_STATE_INTERVAL_MS);
      heartbeat();
    }
    function stopHeartbeat() {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      heartbeatTimer = 0;
    }

    async function leave() {
      stopHeartbeat();
      const leaving = lobby;
      lobby = null;
      emit();
      if (!leaving) return;
      try { await request("POST", { action:"leave", code:leaving.code, playerId:id }); } catch {}
    }

    function updateIdentity(name, characterId) {
      if (!lobby) return;
      const local = localPlayer();
      if (!local) return;
      local.name = clean(name || local.name, 32) || "Player";
      local.characterId = clean(characterId || local.characterId, 120);
      saveName(local.name);
      heartbeat();
    }

    return {
      playerId:id, authenticate, create, join, configure, ready, startMatch, resetMatch, sendEvent, sendPause, endCoopRound, voteRematch, leave,
      heartbeat, updateIdentity, getLobby:() => lobby, localPlayer, remotePlayers, isHost, storedName,
      latencyMs:()=>Math.round(rttMs),
      destroy(){ destroyed=true; stopHeartbeat(); leave(); },
    };
  };
})();