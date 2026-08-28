const OpenAI = require("openai");

exports.handler = async (event) => {
  // Hanya menerima POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Allow": "POST",
      },
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  try {
    // Cek API key
    if (!process.env.NVIDIA_API_KEY) {
      console.error("NVIDIA_API_KEY belum dikonfigurasi");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Konfigurasi AI belum tersedia",
        }),
      };
    }

    // Parse request
    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Format JSON tidak valid",
        }),
      };
    }

    const message = body.message;

    // Validasi message
    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Message wajib diisi",
        }),
      };
    }

    if (message.length > 10000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Message terlalu panjang",
        }),
      };
    }

    // NVIDIA API menggunakan OpenAI-compatible API
    const openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });

    // Request ke NVIDIA
    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v4-pro-0813",

      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten virtual Rekat Adhesive. " +
            "Jawablah pertanyaan tentang produk lem Rekat Adhesive " +
            "dengan profesional, ramah, jelas, dan singkat. " +
            "Jika pertanyaan tidak berkaitan dengan produk atau layanan Rekat Adhesive, " +
            "jawab secara singkat dan arahkan kembali ke produk Rekat Adhesive.",
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],

      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      seed: 42,

      extra_body: {
        chat_template_kwargs: {
          thinking: false,
        },
      },

      stream: false,
    });

    const response =
      completion?.choices?.[0]?.message?.content ||
      "Maaf, saya belum dapat memberikan jawaban.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response,
      }),
    };
  } catch (error) {
    console.error("NVIDIA API Error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Gagal memproses permintaan AI",
      }),
    };
  }
};
