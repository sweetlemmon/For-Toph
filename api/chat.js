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
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({ error: 'Unsupported media type' });
  }

  const userMessage = req.body?.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'Missing message in request body' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    console.error('ERROR: OpenRouter API key is missing');
    return res.status(500).json({ 
      error: 'Server misconfiguration - API key not set' 
    });
  }

  console.log('Received message:', userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''));

  try {
    const startTime = Date.now();
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
      timeout: 10000  // 10 seconds timeout
    });

    const responseTime = Date.now() - startTime;
    
    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json();
      console.error('OpenRouter API error:', {
        status: openRouterResponse.status,
        error: errorData
      });
      return res.status(502).json({
        error: `OpenRouter error: ${errorData.error?.message || openRouterResponse.statusText}`
      });
    }

    const responseData = await openRouterResponse.json();
    const reply = responseData.choices?.[0]?.message?.content?.trim() || 
                  "Pixel is too sleepy to respond 💤";

    console.log(`OpenRouter success! Response time: ${responseTime}ms`);
    return res.status(200).json({ reply });
    
  } catch (error) {
    console.error('Full backend error:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    
    return res.status(500).json({ 
      error: `Connection to AI service failed: ${error.message}`
    });
  }
}
