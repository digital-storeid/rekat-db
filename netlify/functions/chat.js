const { OpenAI } = require('openai');

exports.handler = async (event, context) => {
  // Hanya izinkan POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message } = JSON.parse(event.body);

    const client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: "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"
    });

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-v4-pro-0813",
      messages: [
        {
          role: "system",
          content: "Kamu adalah asisten virtual Rekat Adhesive yang membantu menjawab pertanyaan tentang produk adhesive, lem, dan aplikasi industri. Jawab dengan ramah dan profesional dalam bahasa Indonesia."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 2048,
      stream: false
    });

    const response = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ response: response })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Terjadi kesalahan saat memproses permintaan',
        details: error.message 
      })
    };
  }
};
