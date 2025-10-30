import AIProvider from '../base.ts';
import type { ILoaderOptions, IPrompt } from '@types';
export declare class OllamaProvider extends AIProvider {
    client: any;
    constructor(config: ILoaderOptions);
    getAIConfig(): {
        model: string;
        baseURL: string;
    };
    /**
     * Analyze code with Ollama API
     * @param {string} prompt - Prompt for analysis
     * @param {object} options - Analysis options
     * @returns {Promise<object>} Analysis results
     */
    analyze(prompt: IPrompt): Promise<import("@types").ITranslateResult & any[]>;
    /**
     * Parse Ollama API response into standard format
     * @param {object} response - Raw API response
     * @returns {object} Standardized analysis results
     */
    parseResponse(response: any): import("@types").ITranslateResult & any[];
}
//# sourceMappingURL=ollama.d.ts.map