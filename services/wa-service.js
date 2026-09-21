const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = baileys;

const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class WAService {
  constructor(io, aiService) {
    this.io = io;
    this.ai = aiService;
    this.sock = null;
    this.qrDataUrl = null;
    this.status = 'disconnected';
    this.userInfo = null;
    this.sessionPath = path.resolve(config.whatsapp.sessionPath);
    this.logger = pino({ level: 'silent' });
    this.autoReply = config.whatsapp.autoReply;
    this.contacts = new Map();
    this.messages = new Map();
    this.processedMessages = new Set();
    this._reconnecting = false;
    this._pairingRequested = false;

    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  getState() {
    return {
      appName: config.app.name,
      aiName: this.ai.name,
      status: this.status,
      qr: this.qrDataUrl,
      user: this.userInfo,
      autoReply: this.autoReply,
      botName: config.whatsapp.botName
    };
  }

  emit(event, data) {
    try { this.io.emit(event, data); } catch (e) {}
  }

  async connect() {
    if (this.status === 'connected') return;
    if (this._reconnecting) return;

    try {
      this._reconnecting = true;
      this.status = 'connecting';
      this.emit('wa:status', { status: this.status });

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      console.log(`🔧 Baileys v${version.join('.')}`);

      this.sock = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger)
        },
        browser: Browsers.appropriate('Chrome'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async () => undefined
      });

      this._attachEvents(saveCreds);
    } catch (err) {
      console.error('Connect error:', err);
      this.status = 'disconnected';
      this._reconnecting = false;
      this.emit('wa:status', { status: 'disconnected', error: err.message });
    }
  }

  _attachEvents(saveCreds) {
    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !this._pairingRequested) {
        this.status = 'qr';
        try {
          this.qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'H',
            width: 280,
            margin: 2,
            color: { dark: '#111111', light: '#ffffff' }
          });
          this.emit('wa:qr', { qr: this.qrDataUrl });
          this.emit('wa:status', { status: 'qr' });
        } catch (err) {
          console.error('QR generation error:', err);
        }
      }

      if (connection === 'open') {
        this.status = 'connected';
        this.qrDataUrl = null;
        this._reconnecting = false;
        this._pairingRequested = false;
        const userNumber = this.sock.user?.id?.split(':')[0]?.split('@')[0] || 'unknown';
        this.userInfo = {
          id: this.sock.user?.id,
          name: this.sock.user?.name || this.sock.user?.verifiedName || config.whatsapp.botName,
          number: userNumber
        };
        this.emit('wa:status', { status: 'connected' });
        this.emit('wa:connected', this.userInfo);
        console.log(`✅ WhatsApp terhubung: +${userNumber}`);
      }

      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`🔌 Disconnected. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);

        this.status = shouldReconnect ? 'connecting' : 'disconnected';
        this.qrDataUrl = null;
        if (!shouldReconnect) this.userInfo = null;

        this.emit('wa:status', { status: this.status, reason: statusCode });
        this._reconnecting = false;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('🚪 Logged out. Hapus session...');
          this._clearSession();
        }

        if (shouldReconnect) {
          setTimeout(() => this.connect(), config.whatsapp.reconnectDelay);
        }
      }
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;

          const msgId = msg.key.id;
          if (this.processedMessages.has(msgId)) continue;
          this.processedMessages.add(msgId);
          setTimeout(() => this.processedMessages.delete(msgId), 120000);

          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

          const text = this._extractText(msg.message);
          if (!text) continue;

          const senderName = msg.pushName || jid.split('@')[0];
          this.contacts.set(jid, { jid, name: senderName, number: jid.split('@')[0] });

          if (!this.messages.has(jid)) this.messages.set(jid, []);
          const msgObj = { id: msgId, jid, fromMe: false, text, timestamp: Date.now(), senderName };
          this.messages.get(jid).push(msgObj);

          console.log(`📩 [${senderName}]: ${text}`);
          this.emit('wa:message', msgObj);

          if (this.autoReply) await this._handleAutoReply(jid, text);
        } catch (err) {
          console.error('Message handling error:', err.message);
        }
      }
    });

    this.sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts) {
        if (c.id && !c.id.endsWith('@g.us')) {
          this.contacts.set(c.id, {
            jid: c.id,
            name: c.name || c.notify || c.id.split('@')[0],
            number: c.id.split('@')[0]
          });
        }
      }
      this.emit('wa:contacts', Array.from(this.contacts.values()));
    });
  }

  async _handleAutoReply(jid, userMessage) {
    try {
      await this.sock.sendPresenceUpdate('composing', jid);
      await this._delay(Math.min(userMessage.length * 30, 2000));

      const result = await this.ai.generateReply(jid, userMessage);

      await this.sock.sendPresenceUpdate('paused', jid);
      await this.sock.sendMessage(jid, { text: result.text });

      const replyObj = {
        id: 'ai-' + Date.now(),
        jid,
        fromMe: true,
        text: result.text,
        timestamp: Date.now(),
        isAI: true,
        aiName: this.ai.name
      };
      if (!this.messages.has(jid)) this.messages.set(jid, []);
      this.messages.get(jid).push(replyObj);
      this.emit('wa:message', replyObj);
      this.emit('ai:reply', { jid, text: result.text, elapsed: result.elapsed, aiName: this.ai.name });
      console.log(`🤖 [${this.ai.name}]: ${result.text.substring(0, 80)}...`);
    } catch (err) {
      console.error('Auto-reply error:', err.message);
    }
  }

  async requestPairingCode(phoneNumber) {
    if (!this.sock) {
      await this.connect();
      await this._delay(2000);
    }

    if (!phoneNumber || !/^\d{8,15}$/.test(phoneNumber)) {
      throw new Error('Nomor tidak valid. Format internasional tanpa + (contoh: 6281234567890)');
    }
    if (this.sock.authState.creds.registered) {
      throw new Error('Perangkat sudah terdaftar. Putuskan koneksi terlebih dahulu.');
    }

    try {
      this._pairingRequested = true;
      await this._delay(500);
      const code = await this.sock.requestPairingCode(phoneNumber);
      const formatted = code.match(/.{1,4}/g).join('-');
      this.status = 'pairing';
      this.emit('wa:status', { status: 'pairing', code: formatted });
      console.log('🔑 Pairing code:', formatted);
      return formatted;
    } catch (err) {
      this._pairingRequested = false;
      console.error('Pairing error:', err);
      throw new Error('Gagal membuat kode pairing: ' + err.message);
    }
  }

  async sendMessage(jid, text) {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp belum terhubung');
    }
    const sent = await this.sock.sendMessage(jid, { text });
    const msgObj = { id: sent.key.id, jid, fromMe: true, text, timestamp: Date.now() };
    if (!this.messages.has(jid)) this.messages.set(jid, []);
    this.messages.get(jid).push(msgObj);
    this.emit('wa:message', msgObj);
    return sent;
  }

  async disconnect() {
    try {
      if (this.sock) {
        try { await this.sock.logout(); } catch (e) {}
        try { this.sock.end(undefined); } catch (e) {}
        this.sock = null;
      }
    } catch (err) {
      console.error('Disconnect error:', err.message);
    }
    this._clearSession();
    this.status = 'disconnected';
    this.qrDataUrl = null;
    this.userInfo = null;
    this.emit('wa:status', { status: 'disconnected' });
  }

  _clearSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        fs.mkdirSync(this.sessionPath, { recursive: true });
      }
    } catch (err) {
      console.error('Clear session error:', err.message);
    }
  }

  _extractText(message) {
    if (!message) return null;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
    if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
      return message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    return null;
  }

  _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  getContacts() { return Array.from(this.contacts.values()); }
  getMessages(jid) { return this.messages.get(jid) || []; }

  setAutoReply(enabled) {
    this.autoReply = !!enabled;
    this.emit('wa:autoreply', { enabled: this.autoReply });
  }

  clearChat(jid) {
    this.messages.delete(jid);
    this.ai.clearHistory(jid);
  }
}

module.exports = WAService;
