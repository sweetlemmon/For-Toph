export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for valid content type
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  try {
    // Parse JSON body
    const body = JSON.parse(JSON.stringify(req.body));
    const userMessage = body?.message;
    
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.error('ERROR: OpenRouter API key is missing');
      return res.status(500).json({ 
        error: 'Server configuration error - API key not set' 
      });
    }

    console.log('Received message:', userMessage.substring(0, 100));

    // Create timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1:free',
        messages: [
          {
            role: 'system',
            content: 'You are Pixel, a magical fox AI companion. Respond in a cheerful, adorable, playful way. Be whimsical, emotionally warm, and use emojis occasionally. Keep responses under 3 sentences.'
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', {
        status: openRouterResponse.status,
        error: errorText
      });
      return res.status(openRouterResponse.status).json({
        error: `OpenRouter error: ${openRouterResponse.statusText}`
      });
    }

    const responseData = await openRouterResponse.json();
    const reply = responseData.choices?.[0]?.message?.content?.trim() || 
                  "Pixel is too sleepy to respond 💤";

    return res.status(200).json({ reply });
    
  } catch (error) {
    console.error('Backend error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    let errorMessage = 'Internal server error';
    if (error.name === 'AbortError') {
      errorMessage = 'Request to AI service timed out';
    } else if (error.name === 'SyntaxError') {
      errorMessage = 'Invalid JSON format';
    }
    
    return res.status(500).json({ 
      error: `Backend error: ${errorMessage}`
    });
  }
}
