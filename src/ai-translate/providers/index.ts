import { OpenAIProvider } from './adapters/openai.ts';
import { OllamaProvider } from './adapters/ollama.ts';
import AIProvider from './base.js';

AIProvider.register('OPENAI', OpenAIProvider);
AIProvider.register('DEEPSEEK', OpenAIProvider);
AIProvider.register('LMSTUDIO', OpenAIProvider);
AIProvider.register('OLLAMA', OllamaProvider);

export default AIProvider;