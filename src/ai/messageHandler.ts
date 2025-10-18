import { chatComplete } from './openaiClient';

export async function handleUserMessage(userMessage: string): Promise<string> {
  // For now, just call proxy chat; tool-calls will be added later
  return await chatComplete(userMessage);
}


