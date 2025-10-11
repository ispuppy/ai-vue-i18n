import axios from 'axios';
import AIProvider from '../base.ts';
import AIError from '../../AIError.js';
import type { ILoaderOptions, IPrompt } from '@types';

export class OllamaProvider extends AIProvider {
  client: any;
  constructor(config: ILoaderOptions) {
    super(config);
    this.client = axios.create({
      baseURL: this.config.baseURL || 'http://localhost:11434',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3 * 60 * 1000
    });
  }

  override getAIConfig() {
    return {
      model: 'gpt-3.5-turbo',
      baseURL: 'http://localhost:11434'
    }
  }
  /**
   * Analyze code with Ollama API
   * @param {string} prompt - Prompt for analysis
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Analysis results
   */
  override async analyze(prompt: IPrompt) {
    try {
      const response = await this.client.post('/api/chat',{
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt
          },
          {
            role: 'user',
            content: prompt.userPrompt
          }
        ],
        stream: false
      });
      const results = this.parseResponse(response.data);
      return results;
    } catch (error: any) {
      throw new AIError(error.message, { type: 'API_ERROR'});
    }
  }

  /**
   * Parse Ollama API response into standard format
   * @param {object} response - Raw API response
   * @returns {object} Standardized analysis results
   */
  parseResponse(response: any) {
    const content = response.message?.content || '';
    return this.extractData(content)
  }
}
