require('dotenv').config();

module.exports = {
  app: {
    name: 'HunzWeb-O51W',
    version: '2.0.0'
  },
  ai: {
    name: process.env.AI_NAME || 'HunzAI-O51W',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 500,
    systemPrompt: process.env.AI_SYSTEM_PROMPT ||
      'Anda adalah HunzAI-O51W, asisten customer service yang ramah, sopan, dan profesional. Jawab pertanyaan dengan singkat, jelas, dan membantu. Gunakan bahasa Indonesia.'
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  whatsapp: {
    autoReply: process.env.AUTO_REPLY !== 'false',
    botName: process.env.BOT_NAME || 'HunzWeb-O51W',
    sessionPath: process.env.SESSION_PATH || './sessions',
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 3000
  },
  isDev() {
    return this.server.env === 'development';
  }
};
