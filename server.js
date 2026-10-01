// O51W AI Studio - server kecil (tanpa dependensi, butuh Node 18+).
// Kunci API NVIDIA disimpan di server lewat environment variable, tidak pernah dikirim ke browser.
const http = require("http"), fs = require("fs"), path = require("path");
const KEY = process.env.NVIDIA_API_KEY; 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
const MODEL = process.env.NVIDIA_MODEL || "deepseek-ai/deepseek-v4.1-flash";
const PORT = process.env.PORT || 3000;
if (!KEY) { console.error("Set NVIDIA_API_KEY dulu."); process.exit(1); }

const hits = new Map();
function limited(ip) {
  const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 60000);
  a.push(n); hits.set(ip, a); return a.length > 15; // maks 15 permintaan/menit per IP
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  }
  if (req.method === "POST" && req.url === "/api/chat") {
    if (limited(req.socket.remoteAddress)) { res.writeHead(429); return res.end("Terlalu sering, tunggu sebentar."); }
    let body = "";
    for await (const c of req) { body += c; if (body.length > 300000) { res.writeHead(413); return res.end("Terlalu besar."); } }
    let msgs;
    try { msgs = JSON.parse(body).messages; if (!Array.isArray(msgs)) throw 0; } catch { res.writeHead(400); return res.end("Permintaan salah."); }
    msgs = msgs.filter(m => m && ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string");
    try {
      const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ model: MODEL, messages: msgs, temperature: 1, top_p: 0.95, max_tokens: 16384, stream: true })
      });
      if (!r.ok) { res.writeHead(r.status); return res.end("NVIDIA menolak permintaan (" + r.status + ")."); }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      for await (const chunk of r.body) res.write(chunk);
      res.end();
    } catch (e) { if (!res.headersSent) res.writeHead(502); res.end(); }
    return;
  }
  res.writeHead(404); res.end("Tidak ketemu.");
}).listen(PORT, () => console.log("O51W AI Studio jalan di http://localhost:" + PORT));
  
