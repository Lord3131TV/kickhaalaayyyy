const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ---------- Per-channel rooms (must be declared before routes that use it) ----------
/**
 * rooms: Map<channelSlug, { players: Map, clients: Set<WebSocket>, _slug }>
 */
const rooms = new Map();

function normalizeChannel(slug) {
  if (!slug || typeof slug !== 'string') return '';
  return slug
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?kick\.com\//, '')
    .split(/[/?#]/)[0]
    .replace(/[^a-z0-9_-]/g, '');
}

function getRoom(slug) {
  const key = normalizeChannel(slug);
  if (!key) return null;
  if (!rooms.has(key)) {
    rooms.set(key, {
      players: new Map(),
      clients: new Set(),
      _slug: key
    });
  }
  return rooms.get(key);
}

function getPlayersArray(room) {
  return Array.from(room.players.values()).sort((a, b) => {
    if (a.joinTime !== b.joinTime) return a.joinTime - b.joinTime;
    return a.username.localeCompare(b.username);
  });
}

function broadcastToRoom(slug, data) {
  const room = rooms.get(normalizeChannel(slug));
  if (!room) return;
  const payload = JSON.stringify(data);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (_) {}
    }
  }
}

// ---------- Dynamic routes FIRST (before static) ----------
// /overlay/:channel → clean overlay page (JS reads channel from path)
app.get('/overlay/:channel', (req, res) => {
  res.sendFile(path.join(__dirname, 'overlay.html'));
});

// Bare /overlay (no channel) – still serve page; JS shows hint
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'overlay.html'));
});

// Health + room summary
app.get('/health', (req, res) => {
  const summary = {};
  for (const [slug, room] of rooms) {
    summary[slug] = {
      players: room.players.size,
      clients: room.clients.size
    };
  }
  res.json({
    ok: true,
    rooms: summary,
    totalClients: wss.clients.size
  });
});

// Static files (index.html, overlay.html, assets) – after dynamic routes
app.use(express.static(__dirname));

// ---------- WebSocket ----------
wss.on('connection', (ws) => {
  ws._channel = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    // ---- Subscribe / join a channel room ----
    if (msg.type === 'subscribe' || msg.type === 'join') {
      const slug = normalizeChannel(msg.channel || msg.slug || '');
      if (!slug) {
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'channel required' }));
        } catch (_) {}
        return;
      }

      // Leave previous room
      if (ws._channel) {
        const prev = rooms.get(ws._channel);
        if (prev) prev.clients.delete(ws);
      }

      const room = getRoom(slug);
      if (!room) return;
      room.clients.add(ws);
      ws._channel = slug;

      try {
        ws.send(JSON.stringify({
          type: 'players',
          channel: slug,
          players: getPlayersArray(room)
        }));
      } catch (_) {}
      return;
    }

    // Operations require a channel (from message or previous subscribe)
    const channel = normalizeChannel(msg.channel || ws._channel || '');
    if (!channel) {
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'not subscribed to a channel' }));
      } catch (_) {}
      return;
    }
    const room = getRoom(channel);
    if (!room) return;

    // ---- Add player ----
    if (msg.type === 'add' && msg.player && typeof msg.player.username === 'string') {
      const username = String(msg.player.username).trim();
      if (!username) return;
      const key = username.toLowerCase();
      if (room.players.has(key)) return;
      if (room.players.size >= 80) return;

      const player = {
        username,
        color: msg.player.color && typeof msg.player.color === 'object'
          ? msg.player.color
          : { body: '#e63946', pants: '#1d3557', accent: '#f1faee' },
        joinTime: typeof msg.player.joinTime === 'number' ? msg.player.joinTime : Date.now(),
        angleOffset: typeof msg.player.angleOffset === 'number'
          ? msg.player.angleOffset
          : Math.random() * Math.PI * 2
      };

      room.players.set(key, player);
      broadcastToRoom(channel, {
        type: 'players',
        channel,
        players: getPlayersArray(room)
      });
      return;
    }

    // ---- Remove player ----
    if (msg.type === 'remove' && msg.username) {
      const key = String(msg.username).toLowerCase().trim();
      if (room.players.delete(key)) {
        broadcastToRoom(channel, {
          type: 'players',
          channel,
          players: getPlayersArray(room)
        });
      }
      return;
    }

    // ---- Clear this channel's players ----
    if (msg.type === 'clear') {
      room.players.clear();
      broadcastToRoom(channel, {
        type: 'players',
        channel,
        players: []
      });
      return;
    }
  });

  ws.on('close', () => {
    if (ws._channel) {
      const room = rooms.get(ws._channel);
      if (room) room.clients.delete(ws);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Kick Halay (multi-channel) on port ${PORT}`);
  console.log(`Control : http://localhost:${PORT}/`);
  console.log(`Overlay : http://localhost:${PORT}/overlay/KANAL_ADI`);
});
