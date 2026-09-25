// Vietinis serveris: rodo svetainę ir priima užsakymus į SQLite duomenų bazę.
// Priklausomybių nėra: naudojami tik Node.js įrankiai (node:http, node:sqlite).
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Nustatymai iš .env failo (jei jo yra) ir aplinkos kintamųjų
if (existsSync(path.join(ROOT, ".env"))) process.loadEnvFile(path.join(ROOT, ".env"));
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve(ROOT, process.env.DB_FILE || "data/orders.db");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

await mkdir(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient  TEXT NOT NULL,
    occasion   TEXT NOT NULL,
    details    TEXT NOT NULL,
    tone       TEXT,
    deadline   TEXT,
    email      TEXT NOT NULL,
    phone      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
// SQL užklausos tik su placeholder'iais (?), niekada nesujungiame teksto
const insertOrder = db.prepare(
  "INSERT INTO orders (recipient, occasion, details, tone, deadline, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
const listOrders = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 200");

const OCCASIONS = [
  "Gimtadienis", "Vestuvės", "Jubiliejus", "Kalėdos / Naujieji metai",
  "Palaikymas / padrąsinimas", "Šiaip, geros nuotaikos proga", "Kita (aprašyk žinutėje)"
];
const TONES = ["Juokingas", "Nuoširdus", "Motyvuojantis", "Su daina / repu", "Palieku Jonui nuspręsti"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body) {
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const order = {
    recipient: str(body.recipient, 80),
    occasion: str(body.occasion, 60),
    details: str(body.details, 1500),
    tone: str(body.tone, 60) || null,
    deadline: str(body.deadline, 10) || null,
    email: str(body.email, 120),
    phone: str(body.phone, 30) || null
  };
  if (!order.recipient) return { error: "Nenurodytas gavėjas." };
  if (!OCCASIONS.includes(order.occasion)) return { error: "Neteisinga proga." };
  if (order.details.length < 5) return { error: "Per trumpas aprašymas." };
  if (order.tone && !TONES.includes(order.tone)) return { error: "Neteisingas tonas." };
  if (order.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(order.deadline)) return { error: "Neteisinga data." };
  if (!EMAIL_RE.test(order.email)) return { error: "Neteisingas el. paštas." };
  if (body.consent !== true) return { error: "Reikia sutikti su sąlygomis." };
  return { order };
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Slaptą raktą lyginame pastoviu laiku, kad jo nebūtų galima atspėti pagal greitį
function tokenOk(header) {
  if (!ADMIN_TOKEN) return false;
  const given = Buffer.from(String(header || "").replace(/^Bearer\s+/i, ""));
  const wanted = Buffer.from(ADMIN_TOKEN);
  return given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json"
};
const PUBLIC = new Set(["css", "js", "images", "docs"]);

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const file = path.resolve(ROOT, rel);
  const top = path.relative(ROOT, file).split(path.sep)[0];
  // Leidžiame tik svetainės failus (ne .env, ne duomenų bazę, ne serverio kodą)
  if (!file.startsWith(ROOT + path.sep) || (rel !== "index.html" && !PUBLIC.has(top))) {
    res.writeHead(404).end("Nerasta");
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404).end("Nerasta");
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  try {
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true });
    }
    if (pathname === "/api/orders" && req.method === "POST") {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: "Blogi duomenys." }); }
      const { order, error } = validate(body || {});
      if (error) return sendJson(res, 400, { error });
      const r = insertOrder.run(order.recipient, order.occasion, order.details, order.tone,
        order.deadline, order.email, order.phone);
      const id = "JJ-" + String(r.lastInsertRowid).padStart(4, "0");
      console.log(`Naujas užsakymas ${id}: ${order.occasion}`);
      return sendJson(res, 201, { id });
    }
    if (pathname === "/api/orders" && req.method === "GET") {
      if (!tokenOk(req.headers.authorization)) return sendJson(res, 401, { error: "Reikia ADMIN_TOKEN." });
      return sendJson(res, 200, listOrders.all());
    }
    if (pathname.startsWith("/api/")) return sendJson(res, 404, { error: "Nerasta." });
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: "Serverio klaida." });
  }
});

server.listen(PORT, () => {
  console.log(`Serveris veikia: http://localhost:${PORT}`);
  if (!ADMIN_TOKEN) console.log("Pastaba: ADMIN_TOKEN nenustatytas, užsakymų sąrašas (GET /api/orders) išjungtas.");
});
