// server.js
// Simple WebSocket relay that forwards runner positions to authorized requesters.
// Usage: node server.js
// Note: This example uses a minimal in-memory ACL (for demo only).

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log(`WS relay running on ws://localhost:${PORT}`);