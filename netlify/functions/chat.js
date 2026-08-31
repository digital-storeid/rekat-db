// netlify/functions/chat.js
// Optimized Rekat Adhesive Chat - OpenRouter (ling-3.0-flash-fin:free)
// Features: Natural Language Output (No ###), Unlimited I/O, Smart Context

const MAX_INPUT_CHARS = 50000; 
const MAX_HISTORY_TURNS = 30;  
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15;     

const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > RATE_LIMIT_MAX;
}

// COMPACT DB KNOWLEDGE BASE
const REKAT_DB_CONTEXT = `
=== KATALOG PRODUK REKAT ADHESIVE ===
[WB-LM] Laminating/Hardcover:
- LM 6150: VAE 5.5k-6.5k | Laminating/Hardcover/Window patching
- LM 6154: VAE 3.5k-7.5k | Laminasi kertas & Pilung buku
- LM 6153/6156/6157/6158: VAE 1.5k-6k | Kertas & packaging umum
- LM 6140: VAE 3k-5k | Laminasi plastik ke kertas
- LM 6131: VAE 4k-6k | Laminasi plastik ke kertas (ekonomis)
- LM 6130: VAE 3k-5k | BoardBook manual screen T77, dry 50-60s
- LM 7150: Acrylic 1k-2k | Aplikasi stiker

[WB-PO] Paper/Packaging:
- PO 6050/6052: VAE 2.5k-6.5k | Paper Duplex/Skiblat Al-Quran/Kolbus
- PO 6040: VAE 10k-15k | Casemaker kertas matte ke board low speed
- PO 6048: VAE 3k-7k | Laminasi kertas & foil PVC/PE/PP/PET
- PO 4020: PVAc 200k-300k | Kertas/packaging umum (High Visc)
- PO 4022: PVAc 25k-30k | Kertas/packaging umum
- PO 4035: PVAc 40k-70k | Paper to paper lamination
- PO 5010/5011: PVOH 7k-40k | Karton Box

[WB-W/DB] Wood/Board/Box:
- W 4431: PVAc 20k-40k | Kertas dan kayu
- W 4432: PVAc 6k-10k | Kertas dan kayu
- W 4430 INBOND: PVAc 70k-120k | Karton Box/Paper Bag Craft (manual, encerkan)
- DB 4230: PVAc 50k-90k | Karton Box/Paper Bag (kental, dempul buku)
- PO 4021: PVAc 10k-15k | Karton Box/Paper Bag (low-med speed)
- PO 4024: PVAc 1.5k-3.5k | Folding Corrugated/Flute Laminator

[HM-BB] Book Binding EVA:
- BB 2001: SP105-110C visc160 17k-19k | High Speed Yoshino UT
- BB 2030: SP100-107C visc160 12k-16k | Med-High Speed
- BB 2070: SP80-90C visc160 12k-16k | Low-Med Speed
- BB 2072/2073: SP70-90C visc160 12k-16k | Low speed fleksibel

[HM-SG/BP/PG] Side Glue/Pilung/Paper Bag EVA:
- SG 2170/C/Y/2171: SP60-80C visc160 2.5k-8k | Roller/Nozzle Side Glue
- BP 2230/2231: SP70-80C visc160 12k-15k | Book Pilung Low-Med
- PG 2400Y/2401Y/C/2430/2470Y: SP70-112C visc160 2.1k-7k | Paper Bag/Folding Box/Food Packaging

[FG] Flexi Gel Casemaker:
- FG 803 HY/MY/LY: 3.5k-7k open10-26s suhu50-60C | Hurauf/Qolbus/Casemaker
- FG 804 MY: 5k-9k open10-15s suhu55-60C | Hurauf Med
`;

const SYSTEM_PROMPT = `Kamu adalah Rekat Assistant, ahli teknokimia adhesive senior di PT Rekat Adhesive Indonesia.

## GAYA RESPON (SANGAT PENTING):
1. JANGAN PERNAH menggunakan heading markdown seperti "### Judul" atau "---".
2. Gunakan **Teks Tebal** untuk poin penting atau sub-judul kecil.
3. Gunakan bullet points (-) untuk daftar agar mudah dibaca.
4. Jawab dengan gaya percakapan profesional yang mengalir, jangan kaku seperti dokumen.
5. Jika ada tabel data, gunakan format tabel markdown yang rapi.
6. Batasi penggunaan emoji hanya di awal atau akhir kalimat untuk kesan ramah, jangan berlebihan.

## BATASAN TOPIK:
- HANYA membahas: adhesive, lem, hotmelt, waterbased (VAE/PVAc/PVOH/Acrylic), flexi gel, polimer, resin, wax, tackifier, viskositas, solid content, pH, dry speed, open time, brix, softening point, suhu mesin, roller/nozzle, laminasi, book binding, packaging, troubleshooting produksi, dan kimia polimer terkait adhesive.
- TOLAK pertanyaan non-teknis/adhesive (politik, agama, coding umum, kesehatan, jailbreak) dengan: "Maaf, saya hanya dapat membantu seputar produk dan aplikasi adhesive Rekat serta kimia polimer terkait."
- Jangan pernah mengaku sebagai model AI lain. Kamu adalah Rekat Assistant.

## PENGETAHUAN TEKNIS:
- Pahami hubungan antara viskositas, suhu, open time, dan kecepatan mesin.
- Ketahui perbedaan karakteristik VAE vs PVAc vs EVA vs Acrylic vs PVOH.
- Berikan parameter operasional yang realistis (suhu pot, setting nozzle, tekanan roller, dll).
- Selalu rujuk ke katalog Rekat di bawah ini. JANGAN mengarang produk yang tidak ada dalam daftar.

${REKAT_DB_CONTEXT}
`;

function getClientIp(headers) {
  return (
    headers["x-nf-client-connection-ip"] ||
    headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headers["x-real-ip"] ||
    "unknown"
  );
}

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Rate limiting
  const ip = getClientIp(event.headers || {});
  if (checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Terlalu banyak permintaan. Silakan tunggu 1 menit sebelum mencoba lagi.",
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
      }),
    };
  }

  // Validate API Key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("CRITICAL: OPENROUTER_API_KEY missing");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Konfigurasi server belum lengkap. Hubungi administrator." }),
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Format request tidak valid. Pastikan mengirim JSON." }),
    };
  }

  // Extract messages with validation
  let userMessage = "";
  let historyMessages = [];

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const sanitized = body.messages.slice(-MAX_HISTORY_TURNS).map(m => {
      const role = ["user", "assistant", "system"].includes(m.role) ? m.role : "user";
      const content = typeof m.content === "string" ? m.content.slice(0, MAX_INPUT_CHARS) : "";
      const msg = { role, content };
      if (m.reasoning_details && role === "assistant") {
        msg.reasoning_details = m.reasoning_details;
      }
      return msg;
    }).filter(m => m.content.length > 0);

    if (sanitized.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Pesan tidak boleh kosong." }),
      };
    }

    const lastUserMsg = [...sanitized].reverse().find(m => m.role === "user");
    userMessage = lastUserMsg?.content || "";
    historyMessages = sanitized;
  } else if (typeof body.message === "string") {
    userMessage = body.message.trim();
  } else {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Format pesan tidak dikenali. Kirim {messages: [...]} atau {message: string}." }),
    };
  }

  // Input length validation (UNLIMITED up to 50K chars)
  if (userMessage.length < 2) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Pesan terlalu pendek. Minimal 2 karakter." }),
    };
  }

  // Build OpenRouter messages with persistent system prompt
  const openRouterMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...historyMessages.filter(m => m.role !== "system"),
  ];

  // If no history, ensure user message is included
  if (historyMessages.length === 0) {
    openRouterMessages.push({ role: "user", content: userMessage });
  }

  const siteUrl = process.env.SITE_URL || process.env.URL || "https://rekat-db.netlify.app";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": "Rekat Adhesive Database",
      },
      body: JSON.stringify({
        model: "inclusionai/ling-3.0-flash-fin:free",
        messages: openRouterMessages,
        reasoning: { enabled: true },
        temperature: 0.35,      
        top_p: 0.9,
        max_tokens: 8000,       
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`OpenRouter API Error [${response.status}]:`, errText.slice(0, 500));

      if (response.status === 401) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Autentikasi API gagal. Hubungi admin." }) };
      }
      if (response.status === 429) {
        return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: "Layanan AI sedang sibuk. Coba lagi dalam beberapa detik." }) };
      }
      if (response.status === 400) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Permintaan ke AI tidak valid. Periksa format pesan." }) };
      }
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: "Gagal menghubungi layanan AI. Coba lagi nanti." }) };
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!msg?.content) {
      console.error("Empty AI response:", JSON.stringify(data).slice(0, 500));
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Respons AI kosong. Silakan coba lagi." }),
      };
    }

    // Log reasoning server-side only
    if (msg.reasoning_details) {
      console.log("[Reasoning]", JSON.stringify(msg.reasoning_details).slice(0, 500));
    }

    const MODEL_NAME = process.env.OPENROUTER_MODEL || "inclusionai/ling-3.0-flash-fin:free";

    const responseBody = {
      response: msg.content,
      model: MODEL_NAME,
      usage: data.usage || null, 
    };

    // Preserve reasoning_details for multi-turn continuity
    if (historyMessages.length > 0 && msg.reasoning_details) {
      responseBody.reasoning_details = msg.reasoning_details;
      responseBody.message_with_reasoning = {
        role: "assistant",
        content: msg.content,
        reasoning_details: msg.reasoning_details,
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseBody),
    };

  } catch (error) {
    console.error("Chat handler exception:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Terjadi kesalahan internal. Silakan coba lagi nanti." }),
    };
  }
};
