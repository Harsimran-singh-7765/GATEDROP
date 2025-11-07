// server.js
// Simple WebSocket relay that forwards runner positions to authorized requesters.
// Usage: node server.js
// Note: This example uses a minimal in-memory ACL (for demo only).

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log(`WS relay running on ws://localhost:${PORT}`);


// In-memory maps
const clients = new Map(); // ws -> { role: 'runner'|'requester', id, token }
const runners = new Map(); // runnerId -> ws (latest connection)
const requesters = new Map(); // requesterId -> ws
const subscriptions = new Map(); // requesterId -> Set of runnerIds

// Demo ACL: which requester can observe which runners.
// Replace/integrate with your real auth server. Format: token -> { requesterId, allowedRunners: [] }
const demoTokens = {
  // token : { requesterId, allowedRunners: [runnerId,...] }
  'req-token-1': { requesterId: 'requester-1', allowedRunners: ['runner-1', 'runner-2'] },
  'req-token-2': { requesterId: 'requester-2', allowedRunners: ['runner-2'] },
  // Runner tokens (optional, for runner registration)
  'run-token-1': { runnerId: 'runner-1' },
  'run-token-2': { runnerId: 'runner-2' }
};

// Helper: safe send
function sendSafe(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// Broadcast helper for debugging
function debugClients() {
  console.log('--- clients ---');
  for (let [ws, info] of clients) {
    console.log(info);
  }
  console.log('--- subs ---');
  for (let [req, set] of subscriptions) {
    console.log(req, Array.from(set));
  }
}

wss.on('connection', (ws, req) => {
  console.log('New connection from', req.socket.remoteAddress);

  clients.set(ws, { role: null, id: null, token: null });

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return sendSafe(ws, { type: 'error', reason: 'invalid_json' }); }

    // Handle registration
    if (msg.type === 'register') {
      // { type:'register', role:'runner'|'requester', id:'runner-1', token:'...' }
      const { role, id, token } = msg;
      clients.set(ws, { role, id, token });
      if (role === 'runner') {
        runners.set(id, ws);
        console.log(`Registered runner ${id}`);
        sendSafe(ws, { type: 'registered', role, id });
      } else if (role === 'requester') {
        requesters.set(id, ws);
        subscriptions.set(id, new Set()); // initially empty; requester subscribes to runners
        console.log(`Registered requester ${id}`);
        sendSafe(ws, { type: 'registered', role, id });
      } else {
        sendSafe(ws, { type: 'error', reason: 'invalid_role' });
      }
      return;
    }

    // Requester subscribes to runner(s)
    if (msg.type === 'subscribe') {
      // { type:'subscribe', requesterId:'requester-1', token:'req-token-1', runnerId:'runner-1' }
      const { requesterId, token, runnerId } = msg;
      // basic demo auth: validate token and allowed runner
      const tokenInfo = demoTokens[token];
      if (!tokenInfo || tokenInfo.requesterId !== requesterId) {
        return sendSafe(ws, { type: 'subscribe_ack', ok: false, reason: 'invalid_token' });
      }
      if (!tokenInfo.allowedRunners || !tokenInfo.allowedRunners.includes(runnerId)) {
        return sendSafe(ws, { type: 'subscribe_ack', ok: false, reason: 'forbidden' });
      }
      // everything ok — record subscription
      const set = subscriptions.get(requesterId) || new Set();
      set.add(runnerId);
      subscriptions.set(requesterId, set);
      console.log(`Requester ${requesterId} subscribed to ${runnerId}`);
      return sendSafe(ws, { type: 'subscribe_ack', ok: true, runnerId });
    }

    // Runner position
    if (msg.type === 'pos') {
      // { type:'pos', runnerId:'runner-1', x, y, col, row, t }
      const { runnerId } = msg;
      // Forward to all requesters subscribed to this runner
      for (let [requesterId, wsReq] of requesters) {
        const set = subscriptions.get(requesterId);
        if (set && set.has(runnerId) && wsReq && wsReq.readyState === WebSocket.OPEN) {
          sendSafe(wsReq, msg);
        }
      }
      return;
    }

    // Ping-like or other messages
    if (msg.type === 'ping') {
      sendSafe(ws, { type: 'pong', t: Date.now() });
      return;
    }

    // unknown
    sendSafe(ws, { type: 'error', reason: 'unknown_type' });
  });

  ws.on('close', () => {
    const info = clients.get(ws) || {};
    console.log('Connection closed', info);
    if (info.role === 'runner' && info.id) runners.delete(info.id);
    if (info.role === 'requester' && info.id) {
      requesters.delete(info.id);
      subscriptions.delete(info.id);
    }
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WS error', err);
    clients.delete(ws);
  });

});

// Simple heartbeat to detect dead clients
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; ws.ping(() => {});
  });
}, 30000);

process.on('SIGINT', () => {
  console.log('Stopping server'); clearInterval(interval); wss.close(); process.exit();
});
