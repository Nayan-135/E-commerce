const { asyncHandler } = require('../middleware/error.middleware');

exports.handleMessage = asyncHandler(async (req, res) => {
  const { message, conversation_history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const formattedHistory = conversation_history.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Append the new message
    formattedHistory.push({ role: 'user', content: message });

    // Prepend a system prompt to give the AI context about the store
    formattedHistory.unshift({
      role: 'system',
      content: "You are Nexus AI, a helpful, futuristic shopping assistant for the premium e-commerce store 'Nexus'. Keep responses concise, futuristic, and friendly."
    });

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey || apiKey.includes('your_grok_key_here')) {
      return res.json({ reply: "I am Nexus AI. Grok API Key is not configured yet! Please update Backend/.env" });
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: formattedHistory,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      console.error('Grok API Error:', await response.text());
      throw new Error('Grok API disconnected');
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I couldn't process that.";

    res.json({ reply });
  } catch (error) {
    console.error('[Grok Chatbot Error]', error);
    res.status(500).json({ error: 'AI Assistant temporarily offline' });
  }
});
