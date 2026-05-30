export default async function handler(req, res) {
  // Allow requests from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mimeType } = req.body;
  if (!base64 || !mimeType) return res.status(400).json({ error: 'Missing image data' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,   // ← stored safely in Vercel
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `You are a waste classification assistant. When given an image, identify the waste item and return ONLY a JSON object (no markdown, no backticks) with exactly these keys:
{
  "item": "<short name of the detected item>",
  "category": "<one of: Recycle, Compost, General Waste, Hazardous, E-Waste, Glass>",
  "instructions": "<one concise disposal instruction sentence>"
}`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: 'Classify this waste item.' }
          ]
        }]
      })
    });

    const data = await response.json();
    const raw = data.content.map(c => c.text || '').join('');
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.status(200).json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Classification failed' });
  }
}