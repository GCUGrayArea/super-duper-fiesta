export async function chatComplete(userMessage: string): Promise<string> {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant for a collaborative canvas app. Be concise.' },
      { role: 'user', content: userMessage }
    ]
  };
  const attempt = async () => {
    const res = await fetch('/api/openai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`OpenAI proxy returned ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.toString?.();
    return content || 'Okay.';
  };
  try {
    return await attempt();
  } catch (e1: any) {
    // Minimal backoff then one retry
    await new Promise(r => setTimeout(r, 300));
    try {
      return await attempt();
    } catch (e2: any) {
      return `Agent unavailable: ${e2?.message || e1?.message || 'unknown error'}`;
    }
  }
}


