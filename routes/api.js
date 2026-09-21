const express = require('express');
const router = express.Router();

module.exports = (waService, aiService) => {

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      app: 'HunzWeb-O51W',
      ai: aiService.name,
      uptime: process.uptime(),
      waStatus: waService.status,
      aiModel: aiService.model,
      hasApiKey: !!aiService.client
    });
  });

  router.get('/state', (req, res) => {
    res.json(waService.getState());
  });

  router.get('/contacts', (req, res) => {
    res.json(waService.getContacts());
  });

  router.get('/messages/:jid', (req, res) => {
    res.json(waService.getMessages(req.params.jid));
  });

  router.post('/connect', async (req, res) => {
    try {
      await waService.connect();
      res.json({ ok: true, status: waService.status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/pairing-code', async (req, res) => {
    try {
      const { phone } = req.body;
      const code = await waService.requestPairingCode(phone);
      res.json({ ok: true, code });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/send', async (req, res) => {
    try {
      const { jid, text } = req.body;
      if (!jid || !text) return res.status(400).json({ error: 'jid dan text wajib diisi' });
      await waService.sendMessage(jid, text);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/disconnect', async (req, res) => {
    try {
      await waService.disconnect();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/ai-config', (req, res) => {
    res.json(aiService.getConfig());
  });

  router.post('/ai-settings', (req, res) => {
    try {
      const config = aiService.updateConfig(req.body);
      res.json({ ok: true, config });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/auto-reply', (req, res) => {
    waService.setAutoReply(!!req.body.enabled);
    res.json({ ok: true, enabled: waService.autoReply });
  });

  router.post('/clear-chat/:jid', (req, res) => {
    waService.clearChat(req.params.jid);
    res.json({ ok: true });
  });

  return router;
};
