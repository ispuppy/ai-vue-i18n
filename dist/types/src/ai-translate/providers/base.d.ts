import type { ILoaderOptions, IPrompt, IProviderType, ITranslateResult } from "@types";
export default class AIProvider {
    config: ILoaderOptions;
    constructor(config: ILoaderOptions);
    protected getAIConfig(_providerType: IProviderType): {
        baseURL: string;
        model: string;
    };
    analyze(_prompt: IPrompt): Promise<ITranslateResult>;
    /**
   * Create provider instance based on config
   * @param {object} config - Provider configuration
   * @returns {AIProvider} Provider instance
   */
    static create(config: ILoaderOptions): AIProvider;
    /**
   * Register a new provider implementation
   * @param {string} name - Provider name (e.g. 'openai')
   * @param {class} providerClass - Provider implementation class
   */
    static register(providerType: IProviderType, providerClass: typeof AIProvider): void;
    extractData(content: string): ITranslateResult & any[];
    validateFormat(result: ITranslateResult): ITranslateResult & any[];
    getValueFromText(content: string): any;
}
//# sourceMappingURL=base.d.ts.map