export async function chatComplete(userMessage: string): Promise<string> {
  try {
    const res = await fetch('/api/openai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for a collaborative canvas app. Be concise.' },
          { role: 'user', content: userMessage }
        ]
      })
    });
    if (!res.ok) throw new Error(`OpenAI proxy returned ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.toString?.();
    return content || 'Okay.';
  } catch (e: any) {
    return `Agent unavailable: ${e?.message || 'unknown error'}`;
  }
}


