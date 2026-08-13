import 'dotenv/config';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import http from 'node:http';
import { MasaRoom } from './rooms/MasaRoom';

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Single fixed room name — one table for v1, no matchmaking/room-code UI needed.
gameServer.define('masa', MasaRoom);

const port = Number(process.env.PORT ?? 2567);
gameServer.listen(port).then(() => {
  console.log(`[31] Colyseus listening on :${port}`);
});
