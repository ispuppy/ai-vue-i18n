import AIProvider from '../base.ts';
import type { ILoaderOptions, IPrompt, IProviderType, ITranslateResult } from '@types';
export declare class OpenAIProvider extends AIProvider {
    client: any;
    constructor(config: ILoaderOptions);
    get deepSeekConfig(): {
        model: string;
        baseURL: string;
    };
    get LMStudioConfig(): {
        model: string;
        baseURL: string;
    };
    get openAiConfig(): {
        model: string;
        baseURL: string;
    };
    getAIConfig(providerType: IProviderType): {
        model: string;
        baseURL: string;
    };
    /**
     * Analyze code with OpenAI API
     * @param {string} prompt - Prompt for analysis
     * @param {object} options - Analysis options
     * @returns {Promise<object>} Analysis results
     */
    analyze(prompt: IPrompt): Promise<ITranslateResult>;
    /**
     * Parse OpenAI API response into standard format
     * @param {object} response - Raw API response
     * @returns {object} Standardized analysis results
     */
    parseResponse(response: any): ITranslateResult & any[];
}
//# sourceMappingURL=openai.d.ts.map