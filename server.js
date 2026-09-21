require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const config = require('./config');
const HunzAIService = require('./services/ai-service');
const WAService = require('./services/wa-service');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  maxHttpBufferSize: 1e7
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const aiService = new HunzAIService();
const waService = new WAService(io, aiService);

app.use('/api', apiRoutes(waService, aiService));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.emit('wa:status', { status: waService.status });
  if (waService.qrDataUrl) socket.emit('wa:qr', { qr: waService.qrDataUrl });
  if (waService.userInfo) socket.emit('wa:connected', waService.userInfo);
  socket.emit('wa:contacts', waService.getContacts());

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

server.listen(config.server.port, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🌐 HunzWeb-O51W - Dashboard Server         ║');
  console.log('║   🤖 Powered by HunzAI-O51W (Gemini)         ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   URL: http://localhost:${config.server.port}                 ║`);
  console.log(`║   Env: ${config.server.env.padEnd(38)}║`);
  console.log('╚══════════════════════════════════════════════╝\n');

  waService.connect().catch(err => console.error('Auto-connect failed:', err.message));
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  try {
    if (waService.sock) {
      try { waService.sock.end(undefined); } catch (e) {}
    }
  } catch (e) {}
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err?.message || err);
});
