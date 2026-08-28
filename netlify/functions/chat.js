const { OpenAI } = require('openai');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);

    // PASTIKAN BARIS INI MENGGUNAKAN process.env
    const client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.NVIDIA_API_KEY 
    });

    const completion = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-v3", // Pastikan nama model benar
      messages: [
        { role: "system", content: "Kamu adalah asisten Rekat Adhesive." },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
