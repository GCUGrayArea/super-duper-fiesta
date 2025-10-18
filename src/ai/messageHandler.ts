import { toolSchemas } from './toolSchemas';
import {
  aiCreateRectangle,
  aiCreateCircle,
  aiCreateText,
  aiMoveObject,
  aiResizeObject,
  aiResizeCircle,
  aiResizeText,
  aiRotateObject,
  aiDeleteObject,
  aiArrangeHorizontal,
  aiArrangeVertical,
  aiArrangeGrid,
  aiDistributeEvenly,
  aiGetCanvasState,
  aiGetObjectsByDescription,
  aiGetViewportCenter,
  aiGetCommandHistory
} from './aiTools';
import { undoLastCommand, undoLastNCommands } from './history';

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; name?: string; tool_call_id?: string };

async function openaiChat(body: any): Promise<any> {
  const res = await fetch('/api/openai-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI proxy returned ${res.status}`);
  return await res.json();
}

function getSystemPrompt(): string {
  return [
    'You are an AI assistant for a collaborative canvas. Use tools to act.',
    'Canvas bounds are 0..5000 on both axes. Validate inputs; do not silently clamp.',
    'Prefer concise acknowledgements after executing tools. Ask for clarification if ambiguous.'
  ].join('\n');
}

async function executeTool(functionName: string, args: any, canvasId: string): Promise<any> {
  switch (functionName) {
    case 'createRectangle':
      return await aiCreateRectangle(args.x, args.y, args.width, args.height, args.fill, canvasId);
    case 'createCircle': {
      const radius = typeof args.radius === 'number' ? args.radius : (typeof args.diameter === 'number' ? Math.round(args.diameter / 2) : undefined);
      return await aiCreateCircle(args.x, args.y, radius as number, args.fill, canvasId);
    }
    case 'createText':
      return await aiCreateText(args.text, args.x, args.y, args.fontSize, args.fill, canvasId);
    case 'moveObject':
      return await aiMoveObject(args.objectId, args.x, args.y, canvasId);
    case 'resizeObject':
      return await aiResizeObject(args.objectId, args.width, args.height, canvasId);
    case 'resizeCircle':
      return await aiResizeCircle(args.objectId, args.radius, canvasId);
    case 'resizeText':
      return await aiResizeText(args.objectId, args.fontSize, canvasId);
    case 'rotateObject':
      return await aiRotateObject(args.objectId, args.degrees, canvasId);
    case 'deleteObject':
      return await aiDeleteObject(args.objectId, canvasId);
    case 'arrangeHorizontal':
      return await aiArrangeHorizontal(args.objectIds || [], typeof args.spacing === 'number' ? args.spacing : 16, canvasId);
    case 'arrangeVertical':
      return await aiArrangeVertical(args.objectIds || [], typeof args.spacing === 'number' ? args.spacing : 16, canvasId);
    case 'arrangeGrid':
      return await aiArrangeGrid(args.objectIds || [], typeof args.cols === 'number' ? args.cols : undefined, typeof args.spacing === 'number' ? args.spacing : 16, canvasId);
    case 'distributeEvenly':
      return await aiDistributeEvenly(args.objectIds || [], args.axis === 'vertical' ? 'vertical' : 'horizontal', canvasId);
    case 'getCanvasState':
      return await aiGetCanvasState(canvasId);
    case 'getObjectsByDescription':
      return await aiGetObjectsByDescription(args.description, canvasId);
    case 'getViewportCenter':
      return await aiGetViewportCenter();
    case 'undoLastCommand':
      return await undoLastCommand(canvasId);
    case 'undoLastNCommands':
      return await undoLastNCommands(canvasId, Number(args?.n || 1));
    case 'getCommandHistory':
      return await aiGetCommandHistory(canvasId, Number(args?.n || 20));
    default:
      return { success: false, error: `Unknown function: ${functionName}` };
  }
}

export async function handleUserMessage(userMessage: string): Promise<string> {
  // Back-compat: simple echo through proxy for callers that don't use tool calling
  try {
    const data = await openaiChat({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for a collaborative canvas app. Be concise.' },
        { role: 'user', content: userMessage }
      ]
    });
    const content = data?.choices?.[0]?.message?.content?.toString?.();
    return content || 'Okay.';
  } catch (e: any) {
    return `Agent unavailable: ${e?.message || 'unknown error'}`;
  }
}

export async function handleUserMessageWithTools(
  userMessage: string,
  canvasId: string,
  conversation: ChatMessage[] = []
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: getSystemPrompt() },
    ...conversation.map(m => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: 'user', content: userMessage }
  ];

  // First call: allow tool selection
  const first = await openaiChat({ model: 'gpt-4o-mini', messages, tools: toolSchemas, tool_choice: 'auto' });
  const msg = first?.choices?.[0]?.message as any;
  const toolCalls: any[] = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];

  if (toolCalls.length === 0) {
    const content = (msg?.content || '').toString?.();
    return content || 'Done.';
  }

  // Guardrails: check for mass deletions and extreme resizes before executing
  try {
    const deletes = toolCalls.filter(c => c?.function?.name === 'deleteObject');
    if (deletes.length > 3) {
      return `You're deleting ${deletes.length} objects. Should I proceed?`;
    }
    const resizes = toolCalls.filter(c => c?.function?.name === 'resizeObject');
    if (resizes.length > 0) {
      const state = await aiGetCanvasState(canvasId);
      const map = new Map(state.map((o: any) => [o.id, o] as const));
      let needsClarify = false;
      for (const r of resizes) {
        try {
          const args = r.function?.arguments ? JSON.parse(r.function.arguments) : {};
          const o = map.get(String(args.objectId));
          if (!o) continue;
          const newW = Number(args.width);
          const newH = Number(args.height);
          const curW = Number((o as any).width || 0);
          const curH = Number((o as any).height || 0);
          if (curW > 0 && newW > curW * 3) { needsClarify = true; break; }
          if (curH > 0 && newH > curH * 3) { needsClarify = true; break; }
        } catch { /* ignore */ }
      }
      if (needsClarify) {
        return 'That resize is more than 3x; should I proceed?';
      }
    }
  } catch { /* best-effort guardrails */ }

  // Execute tools
  const toolResults: ChatMessage[] = [];
  for (const call of toolCalls) {
    try {
      const fnName = call.function?.name as string;
      const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      const result = await executeTool(fnName, args, canvasId);
      toolResults.push({ role: 'tool', tool_call_id: call.id, name: fnName, content: JSON.stringify(result) });
    } catch (err: any) {
      toolResults.push({ role: 'tool', tool_call_id: call.id, name: call.function?.name, content: JSON.stringify({ success: false, error: err?.message || 'Execution failed' }) });
    }
  }

  // Second call: generate final response using tool results
  const followupMessages: any[] = [
    ...messages,
    { role: 'assistant', content: null, tool_calls: toolCalls },
    ...toolResults
  ];
  const second = await openaiChat({ model: 'gpt-4o-mini', messages: followupMessages });
  const content = second?.choices?.[0]?.message?.content?.toString?.();
  return content || 'Done.';
}

