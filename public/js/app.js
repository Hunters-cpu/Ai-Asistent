/* =========================================================
   HunzWeb-O51W - Frontend App
   AI: HunzAI-O51W
   ========================================================= */

const App = (() => {
  const State = {
    waStatus: 'disconnected',
    waUser: null,
    contacts: [],
    messages: {},
    activeChatId: null,
    stats: { msgToday: 0, responseTime: '-' },
    startTime: Date.now(),
    socketConnected: false,
    logs: []
  };

  const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 20,
    transports: ['websocket', 'polling']
  });

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  };

  const showToast = (msg, type = 'success') => {
    const container = $('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(msg)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut .3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const addLog = (msg, type = 'info') => {
    State.logs.unshift({ time: new Date().toLocaleTimeString('id-ID'), type, msg });
    if (State.logs.length > 100) State.logs = State.logs.slice(0, 100);
    renderLog();
  };

  const renderLog = () => {
    const el = $('activityLog');
    if (!el) return;
    if (State.logs.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">Belum ada aktivitas</div>';
      return;
    }
    el.innerHTML = State.logs.map(l => `
      <div class="log-line">
        <span class="log-time">[${l.time}]</span>
        <span class="log-tag ${l.type}">[${l.type.toUpperCase()}]</span>
        <span>${escapeHtml(l.msg)}</span>
      </div>
    `).join('');
  };

  const api = async (path, options = {}) => {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request gagal');
    return data;
  };

  const showView = (viewId) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    $(viewId)?.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateStats = () => {
    $('statMsgToday').textContent = State.stats.msgToday;
    $('statContacts').textContent = State.contacts.length;
    $('statResponse').textContent = State.stats.responseTime;
  };

  const updateBadge = (online, label) => {
    const badge = $('storageBadge');
    badge.classList.toggle('offline', !online);
    $('storageLabel').textContent = label;
  };

  const updateUptime = () => {
    const elapsed = Math.floor((Date.now() - State.startTime) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    $('sidebarUptime').textContent = h > 0 ? `${h}j ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const updateSystemStatus = () => {
    const badge = $('systemStatusBadge');
    const conn = $('sidebarConnStatus');
    const socketStatus = $('sidebarSocketStatus');

    if (State.waStatus === 'connected') {
      badge.textContent = 'ONLINE';
      badge.style.background = '#e8f5e9';
      badge.style.color = '#2e7d32';
      conn.textContent = 'Terhubung';
      conn.style.color = '#2e7d32';
    } else if (['connecting','qr','pairing'].includes(State.waStatus)) {
      badge.textContent = 'MENUNGGU';
      badge.style.background = '#fff3e0';
      badge.style.color = '#e65100';
      conn.textContent = State.waStatus;
      conn.style.color = '#e65100';
    } else {
      badge.textContent = 'OFFLINE';
      badge.style.background = '#ffebee';
      badge.style.color = '#c62828';
      conn.textContent = 'Terputus';
      conn.style.color = '#c62828';
    }

    socketStatus.textContent = State.socketConnected ? 'Aktif' : 'Terputus';
    socketStatus.style.color = State.socketConnected ? '#2e7d32' : '#c62828';
  };

  const updateConnectionUI = () => {
    const flow = $('connectionFlow');
    const conn = $('connectionConnected');

    if (State.waStatus === 'connected' && State.waUser) {
      flow.style.display = 'none';
      conn.style.display = 'block';
      $('connectedNumber').textContent = '+' + State.waUser.number;
      $('connectedName').textContent = State.waUser.name || '-';
    } else {
      flow.style.display = 'block';
      conn.style.display = 'none';

      const loading = $('qrLoading');
      const img = $('qrImage');

      if (State.waStatus === 'qr' && img.src) {
        loading.style.display = 'none';
        img.style.display = 'block';
      } else if (State.waStatus === 'disconnected' || State.waStatus === 'connecting') {
        loading.style.display = 'flex';
        img.style.display = 'none';
      }
    }
  };

  const renderChatList = () => {
    const el = $('chatListItems');
    const search = $('chatSearch').value.toLowerCase();
    const filtered = State.contacts.filter(c =>
      (c.name || '').toLowerCase().includes(search) || (c.number || '').includes(search)
    );

    if (filtered.length === 0) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">Belum ada kontak</div>';
      return;
    }

    el.innerHTML = filtered.map(c => {
      const initial = (c.name || c.number || '?').charAt(0).toUpperCase();
      const msgs = State.messages[c.jid] || [];
      const last = msgs[msgs.length - 1];
      const preview = last ? (last.fromMe ? 'Anda: ' : '') + (last.text || '').substring(0, 40) : 'Belum ada pesan';
      return `
        <div class="chat-item ${State.activeChatId === c.jid ? 'active' : ''}" onclick="App.openChat('${c.jid}')">
          <div class="chat-avatar">${initial}</div>
          <div class="chat-info">
            <h5>${escapeHtml(c.name || c.number)}</h5>
            <p>${escapeHtml(preview)}</p>
          </div>
        </div>`;
    }).join('');
  };

  const renderSidebarChatList = () => {
    const el = $('sidebarChatList');
    const list = Object.keys(State.messages)
      .map(jid => {
        const msgs = State.messages[jid];
        const last = msgs[msgs.length - 1];
        const contact = State.contacts.find(c => c.jid === jid);
        return { jid, last, contact };
      })
      .filter(x => x.last)
      .sort((a, b) => b.last.timestamp - a.last.timestamp)
      .slice(0, 4);

    if (list.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Belum ada chat</div>';
      return;
    }

    el.innerHTML = list.map(({ jid, last, contact }) => {
      const name = contact?.name || jid.split('@')[0];
      const initial = name.charAt(0).toUpperCase();
      return `
        <div class="chat-item" onclick="App.openChat('${jid}')">
          <div class="chat-avatar">${initial}</div>
          <div class="chat-info">
            <h5>${escapeHtml(name)}</h5>
            <p>${escapeHtml((last.text || '').substring(0, 40))}</p>
          </div>
        </div>`;
    }).join('');
  };

  const renderContacts = () => {
    const grid = $('contactGrid');
    $('contactCount').textContent = State.contacts.length;

    if (State.contacts.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <i class="fas fa-address-book"></i>
          <h3>Belum Ada Kontak</h3>
          <p>Kontak muncul otomatis saat ada pesan masuk</p>
        </div>`;
      return;
    }

    grid.innerHTML = State.contacts.map(c => {
      const name = c.name || c.number;
      const initial = name.charAt(0).toUpperCase();
      return `
        <div class="card" style="padding:20px;text-align:center;">
          <div class="chat-avatar" style="width:56px;height:56px;font-size:20px;margin:0 auto 12px;">${initial}</div>
          <h4 style="font-size:14px;font-weight:600;margin-bottom:4px;">${escapeHtml(name)}</h4>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">+${escapeHtml(c.number)}</p>
          <button class="btn btn-dark btn-sm btn-full" onclick="App.openChat('${c.jid}')">
            <i class="fas fa-comment"></i> Chat
          </button>
        </div>`;
    }).join('');
  };

  const renderChatWindow = (jid) => {
    const contact = State.contacts.find(c => c.jid === jid);
    const name = contact?.name || jid.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    const msgs = State.messages[jid] || [];

    $('chatWindow').innerHTML = `
      <div class="chat-window-header">
        <div class="chat-avatar">${initial}</div>
        <div style="flex:1;">
          <h4>${escapeHtml(name)}</h4>
          <p>+${escapeHtml(jid.split('@')[0])}</p>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages">
        ${msgs.length === 0 ? '<div style="text-align:center;color:var(--text-muted);font-size:13px;margin:auto;">Belum ada pesan</div>' : msgs.map(m => `
          <div class="msg ${m.fromMe ? 'out' : 'in'} ${m.isAI ? 'msg-ai' : ''}">
            ${escapeHtml(m.text)}
            <span class="msg-time">${new Date(m.timestamp).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}${m.isAI ? ' 🤖 HunzAI-O51W' : ''}</span>
          </div>
        `).join('')}
      </div>
      <div class="chat-input-area">
        <input type="text" id="chatInput" placeholder="Ketik pesan..." onkeypress="if(event.key==='Enter') App.sendMessage()">
        <button onclick="App.sendMessage()"><i class="fas fa-paper-plane"></i></button>
      </div>
    `;

    setTimeout(() => {
      const el = $('chatMessages');
      if (el) el.scrollTop = el.scrollHeight;
      $('chatInput')?.focus();
    }, 50);
  };

  const reconnect = async () => {
    try {
      addLog('Meminta QR baru...', 'info');
      await api('/api/connect', { method: 'POST' });
      showToast('Menghubungkan ulang...', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const requestPairingCode = async () => {
    const phone = $('phoneNumber').value.trim();
    const btn = $('pairBtn');

    if (!phone || !/^\d{10,15}$/.test(phone)) {
      showToast('Nomor tidak valid (10-15 digit)', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;"></div> Memproses...';

    try {
      const data = await api('/api/pairing-code', {
        method: 'POST',
        body: JSON.stringify({ phone })
      });
      $('pairingCode').textContent = data.code;
      $('codeDisplay').style.display = 'block';
      $('pairingPlaceholder').style.display = 'none';
      showToast('Kode pairing berhasil dibuat', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> Minta Kode';
    }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm('Yakin ingin memutuskan koneksi WhatsApp?')) return;
    try {
      await api('/api/disconnect', { method: 'POST' });
      State.waUser = null;
      State.contacts = [];
      State.messages = {};
      showToast('Koneksi diputuskan', 'warning');
      updateConnectionUI();
      updateSystemStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const loadContacts = async () => {
    try {
      const contacts = await api('/api/contacts');
      State.contacts = contacts;
      renderContacts();
      renderChatList();
      renderSidebarChatList();
      updateStats();
    } catch (err) {}
  };

  const sendMessage = async () => {
    const input = $('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !State.activeChatId) return;

    input.value = '';
    try {
      await api('/api/send', {
        method: 'POST',
        body: JSON.stringify({ jid: State.activeChatId, text })
      });
    } catch (err) {
      showToast(err.message, 'error');
      input.value = text;
    }
  };

  const saveAISettings = async () => {
    try {
      const payload = {
        model: $('aiModel').value,
        systemPrompt: $('aiPrompt').value,
        temperature: $('aiTemp').value,
        maxTokens: $('aiTokens').value
      };
      const key = $('aiApiKey').value.trim();
      if (key) payload.apiKey = key;

      const res = await api('/api/ai-settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Pengaturan HunzAI-O51W disimpan', 'success');
      addLog('Konfigurasi HunzAI-O51W diperbarui', 'success');
      updateApiKeyStatus(res.config);
      $('sidebarAIModel').textContent = res.config.model;
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleAutoReply = async (enabled) => {
    try {
      await api('/api/auto-reply', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      });
      addLog(`Auto-reply ${enabled ? 'aktif' : 'nonaktif'}`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openChat = (jid) => {
    State.activeChatId = jid;
    showView('view-chats');
    renderChatWindow(jid);
    renderChatList();
  };

  const clearLog = () => {
    State.logs = [];
    renderLog();
    showToast('Log dibersihkan', 'success');
  };

  const updateApiKeyStatus = (config) => {
    const el = $('apiKeyStatus');
    if (!el) return;
    if (config?.hasApiKey) {
      el.innerHTML = '<span style="color:var(--success);">✓ HunzAI-O51W aktif</span>';
    } else {
      el.innerHTML = '<span style="color:var(--warning);">⚠ Fallback mode (keyword-based)</span>';
    }
  };

  socket.on('connect', () => {
    State.socketConnected = true;
    updateBadge(true, 'HunzWeb terhubung');
    addLog('Terhubung ke HunzWeb-O51W', 'success');
    updateSystemStatus();
  });

  socket.on('disconnect', () => {
    State.socketConnected = false;
    updateBadge(false, 'Server terputus');
    addLog('Server terputus', 'error');
    updateSystemStatus();
  });

  socket.on('wa:status', (data) => {
    State.waStatus = data.status;
    updateConnectionUI();
    updateSystemStatus();

    const msgs = {
      connecting: ['Menghubungkan ke WhatsApp...', 'info'],
      qr: ['QR Code diterima, silakan scan', 'info'],
      pairing: ['Kode pairing dibuat', 'success'],
      connected: ['WhatsApp terhubung!', 'success'],
      disconnected: ['WhatsApp terputus', 'warn']
    };
    if (msgs[data.status]) addLog(msgs[data.status][0], msgs[data.status][1]);
  });

  socket.on('wa:qr', ({ qr }) => {
    const img = $('qrImage');
    const loading = $('qrLoading');
    img.src = qr;
    img.style.display = 'block';
    loading.style.display = 'none';
    addLog('QR baru diterima', 'info');
  });

  socket.on('wa:connected', (user) => {
    State.waUser = user;
    updateConnectionUI();
    updateSystemStatus();
    showToast('WhatsApp berhasil terhubung!', 'success');
    loadContacts();
  });

  socket.on('wa:message', (msg) => {
    const jid = msg.jid;
    if (!State.messages[jid]) State.messages[jid] = [];
    if (State.messages[jid].some(m => m.id === msg.id)) return;
    State.messages[jid].push(msg);

    State.stats.msgToday++;
    updateStats();
    renderSidebarChatList();
    renderChatList();

    if (State.activeChatId === jid) {
      renderChatWindow(jid);
    }
  });

  socket.on('ai:reply', ({ jid, text, elapsed }) => {
    State.stats.responseTime = elapsed + 'ms';
    updateStats();
    addLog(`HunzAI-O51W balas (${elapsed}ms)`, 'success');
  });

  socket.on('wa:contacts', (contacts) => {
    State.contacts = contacts;
    renderContacts();
    renderChatList();
    renderSidebarChatList();
    updateStats();
  });

  const init = async () => {
    addLog('HunzWeb-O51W dimuat', 'info');
    updateSystemStatus();
    updateStats();
    setInterval(updateUptime, 1000);

    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });

    document.querySelectorAll('.tab-pill').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        $('tab-qr').style.display = target === 'qr' ? 'grid' : 'none';
        $('tab-pairing').style.display = target === 'pairing' ? 'grid' : 'none';
      });
    });

    $('aiTemp').addEventListener('input', (e) => {
      $('tempValue').textContent = e.target.value;
    });

    $('chatSearch').addEventListener('input', renderChatList);

    $('autoReply').addEventListener('change', (e) => {
      toggleAutoReply(e.target.checked);
    });

    try {
      const state = await api('/api/state');
      State.waStatus = state.status;
      if (state.user) State.waUser = state.user;
      if (state.qr) {
        $('qrImage').src = state.qr;
        $('qrImage').style.display = 'block';
        $('qrLoading').style.display = 'none';
      }
      if (state.autoReply !== undefined) {
        $('autoReply').checked = state.autoReply;
      }
      updateConnectionUI();
      updateSystemStatus();
    } catch (err) {
      console.warn('Failed fetch state:', err);
    }

    try {
      const aiCfg = await api('/api/ai-config');
      $('aiModel').value = aiCfg.model;
      $('aiPrompt').value = aiCfg.systemPrompt;
      $('aiTemp').value = aiCfg.temperature;
      $('tempValue').textContent = aiCfg.temperature;
      $('aiTokens').value = aiCfg.maxTokens;
      $('sidebarAIModel').textContent = aiCfg.model;
      updateApiKeyStatus(aiCfg);
    } catch (err) {
      console.warn('Failed fetch ai config:', err);
    }

    await loadContacts();
  };

  return {
    init,
    showView,
    openChat,
    sendMessage,
    reconnect,
    requestPairingCode,
    disconnectWhatsApp,
    loadContacts,
    saveAISettings,
    clearLog
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
