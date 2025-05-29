// /api/chat.js
export default async function handler(req, res) {
  // Set CORS headers (restrict to your Vercel URL)
  res.setHeader('Access-Control-Allow-Origin', 'https://for-toph.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for valid JSON
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  try {
    const { message: userMessage } = req.body;
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error('ERROR: OpenRouter API key is missing');
      return res.status(500).json({
        error: 'Server configuration error – API key not set'
      });
    }

    console.log('Received message:', userMessage.substring(0, 100));

    // Timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Call OpenRouter
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://for-toph.vercel.app',
        'X-Title': 'Aurora Chat'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1:free',
        messages: [
          {
            role: 'system',
            content: "You are Aurora, a friendly companion. Respond in a cheerful, cute and playful way. You're talking to Toph. Reply in max 3 sentences."
          },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', {
        status: openRouterResponse.status,
        error: errorText
      });
      return res.status(502).json({
        error: `Aurora couldn’t reach the ocean: ${openRouterResponse.statusText || 'unknown issue'}`
      });
    }

    const { choices } = await openRouterResponse.json();
    const reply = choices?.[0]?.message?.content?.trim()
      || "Aurora is swimming deep underwater... 🦭🌊 Try again later!";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Backend error:', error);
    const isTimeout = error.name === 'AbortError';
    return res.status(500).json({
      error: `Ocean currents disrupted: ${isTimeout ? 'Request timed out' : 'Internal server error'}`
    });
  }
}

