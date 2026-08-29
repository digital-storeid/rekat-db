const OpenAI = require('openai');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);

    const client = new OpenAI({
      baseURL: process.env.AI_BASE_URL, 
      apiKey: process.env.AI_API_KEY, 
    });

    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "Kamu adalah asisten virtual Rekat Adhesive. Bantu pengguna menemukan informasi tentang produk lem dan adhesive." 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };

  } catch (error) {
    console.error("AI Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Gagal terhubung ke AI', 
        details: error.message 
      })
    };
  }
};
