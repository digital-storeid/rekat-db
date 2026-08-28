const OpenAI = require('openai');

exports.handler = async (event, context) => {
  // 1. Cek Method Request
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);

    // 2. Inisialisasi Client (Key diambil dari Environment Variable Netlify)
    const openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY, 
      baseURL: 'https://integrate.api.nvidia.com/v1',
    });

    // 3. Panggil Model DeepSeek V4 Pro
    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-v4-pro-0813", // Ganti ke v4-pro-0813 jika sudah aktif di akunmu
      messages: [
        { 
          role: "system", 
          content: "Kamu adalah asisten virtual Rekat Adhesive. Jawablah pertanyaan tentang produk lem dengan profesional." 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      seed: 42,
      extra_body: { // Parameter khusus NVIDIA
        chat_template_kwargs: {
          thinking: false
        }
      },
      stream: false
    });

    // 4. Kirim Balasan ke Frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        response: completion.choices[0].message.content 
      })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Gagal memproses permintaan AI',
        details: error.message 
      })
    };
  }
};
