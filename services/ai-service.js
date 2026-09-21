const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

class HunzAIService {
  constructor() {
    this.name = config.ai.name;
    this.client = null;
    this.model = config.ai.model;
    this.systemPrompt = config.ai.systemPrompt;
    this.temperature = config.ai.temperature;
    this.maxTokens = config.ai.maxTokens;
    this.history = new Map();
    this.maxHistory = 10;
    this.stats = { totalCalls: 0, totalTokens: 0, avgResponseTime: 0 };
    this.init();
  }

  init() {
    const key = config.ai.apiKey;
    if (!key || key.includes('your-api-key')) {
      console.warn(`⚠️  ${this.name}: GEMINI_API_KEY belum di-set → fallback mode aktif`);
      return;
    }
    try {
      this.client = new GoogleGenAI({ apiKey: key });
      console.log(`✓ ${this.name} siap (model: ${this.model})`);
    } catch (err) {
      console.error(`✗ ${this.name} gagal init:`, err.message);
    }
  }

  updateConfig(cfg) {
    if (cfg.model) this.model = cfg.model;
    if (cfg.systemPrompt) this.systemPrompt = cfg.systemPrompt;
    if (cfg.temperature !== undefined) this.temperature = parseFloat(cfg.temperature);
    if (cfg.maxTokens) this.maxTokens = parseInt(cfg.maxTokens);
    if (cfg.apiKey && cfg.apiKey.trim()) {
      try {
        this.client = new GoogleGenAI({ apiKey: cfg.apiKey.trim() });
        console.log(`✓ ${this.name}: API Key diperbarui`);
      } catch (err) {
        console.error(`✗ ${this.name}: API Key invalid:`, err.message);
      }
    }
    return this.getConfig();
  }

  getConfig() {
    return {
      name: this.name,
      model: this.model,
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      hasApiKey: !!this.client,
      provider: 'google-gemini',
      stats: this.stats
    };
  }

  getHistory(jid) {
    if (!this.history.has(jid)) this.history.set(jid, []);
    return this.history.get(jid);
  }

  clearHistory(jid) {
    this.history.delete(jid);
  }

  async generateReply(jid, userMessage) {
    if (!this.client) return this.fallbackReply(userMessage);

    try {
      const history = this.getHistory(jid);
      history.push({ role: 'user', parts: [{ text: userMessage }] });
      while (history.length > this.maxHistory) history.shift();

      const startTime = Date.now();
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [...history],
        config: {
          systemInstruction: this.systemPrompt,
          temperature: this.temperature,
          maxOutputTokens: this.maxTokens
        }
      });

      const reply = response.text?.trim() || 'Maaf, saya tidak dapat menjawab saat ini.';
      const elapsed = Date.now() - startTime;
      const tokenCount = response.usageMetadata?.totalTokenCount || 0;

      history.push({ role: 'model', parts: [{ text: reply }] });
      while (history.length > this.maxHistory) history.shift();

      this.stats.totalCalls++;
      this.stats.totalTokens += tokenCount;
      this.stats.avgResponseTime = Math.round(
        (this.stats.avgResponseTime * (this.stats.totalCalls - 1) + elapsed) / this.stats.totalCalls
      );

      return { text: reply, elapsed, tokens: tokenCount, aiName: this.name };
    } catch (err) {
      return this.handleError(err);
    }
  }

  handleError(err) {
    console.error(`${this.name} Error:`, err.message);
    const status = err.status || err.code;
    const msg = err.message || '';

    if (status === 400) return { text: '⚠️ Permintaan tidak valid. Cek konfigurasi model.', elapsed: 0 };
    if (status === 401 || status === 403) return { text: '⚠️ API Key Gemini tidak valid.', elapsed: 0 };
    if (status === 429) return { text: '⚠️ Rate limit tercapai. Mohon tunggu sebentar.', elapsed: 0 };
    if (status === 500 || status === 503) return { text: '⚠️ Server Gemini sedang bermasalah.', elapsed: 0 };
    if (msg.includes('quota')) return { text: '⚠️ Kuota habis. Coba lagi besok atau upgrade plan.', elapsed: 0 };
    if (msg.includes('SAFETY') || msg.includes('RECITATION')) return { text: 'Maaf, saya tidak bisa menanggapi pesan tersebut.', elapsed: 0 };

    return { text: 'Maaf, terjadi kesalahan saat memproses pesan.', elapsed: 0 };
  }

  fallbackReply(text) {
    const lower = text.toLowerCase();
    const replies = {
      'halo': `Halo! Saya ${this.name}, ada yang bisa saya bantu? 😊`,
      'hai': `Hai! Saya ${this.name}, selamat datang 👋`,
      'harga': 'Untuk informasi harga, silakan sebutkan produk yang Anda minati.',
      'stok': 'Stok tersedia. Produk apa yang Anda butuhkan?',
      'kirim': 'Pengiriman biasanya 1-3 hari kerja tergantung lokasi Anda.',
      'bayar': 'Kami menerima transfer bank, e-wallet (OVO, GoPay, Dana), dan COD.',
      'promo': 'Ada promo menarik! Hubungi admin untuk detail terbaru.',
      'terima kasih': 'Sama-sama! Senang bisa membantu 😊',
      'makasih': 'Sama-sama! 🙏',
      'buka': 'Kami buka setiap hari 09.00 - 21.00 WIB.'
    };
    for (const k in replies) {
      if (lower.includes(k)) return { text: replies[k], elapsed: 0, fallback: true, aiName: this.name };
    }
    return {
      text: `Baik, pesan Anda sudah saya terima. Ada lagi yang bisa saya bantu?`,
      elapsed: 0,
      fallback: true,
      aiName: this.name
    };
  }
}

module.exports = HunzAIService;
