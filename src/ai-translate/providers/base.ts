import type { ILoaderOptions, IPrompt, IProviderType, ITranslateResult } from "@types";

const providers: Partial<Record<IProviderType, typeof AIProvider>> = {};

const ERROR_FORMAT_MSG = 'The returned data format does not conform to the specification'
export default class AIProvider {
  config: ILoaderOptions
  constructor(config: ILoaderOptions) {
    const providerType = config.providerType.toUpperCase() as IProviderType
    const { baseURL: defaultURL, model: defaultModel } = this.getAIConfig(providerType)
    this.config = { 
      ...config, 
      baseURL: config.baseURL || defaultURL, 
      model: config.model || defaultModel 
    }
  }

  protected getAIConfig(_providerType: IProviderType): { baseURL: string, model: string } {
    throw new Error('Method getAIConfig must be implemented by subclass')
  }

  public async analyze(_prompt: IPrompt): Promise<ITranslateResult> {
    throw new Error('Method analyze must be implemented by subclass')
  }

  /**
 * Create provider instance based on config
 * @param {object} config - Provider configuration
 * @returns {AIProvider} Provider instance
 */
  static create(config: ILoaderOptions) {
    const providerType = config.providerType.toUpperCase() as IProviderType
    if (providers[providerType]) {
      return new providers[providerType](config);
    }

    throw new Error(`Unsupported provider type: ${config.providerType}`);
  }

  /**
 * Register a new provider implementation
 * @param {string} name - Provider name (e.g. 'openai')
 * @param {class} providerClass - Provider implementation class
 */
  static register(providerType: IProviderType, providerClass: typeof AIProvider) {
    if (!providerType || typeof providerType !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!providerClass || typeof providerClass!=='function') {
     throw new Error('ProviderClass must be a class') 
    }
    providers[providerType] = providerClass;
  }

  extractData(content: string) {
    const data = this.getValueFromText(content) || {}
    return this.validateFormat(data)
  }

  validateFormat(result: ITranslateResult) {
    if(!Reflect.has(result, 'result')) {
      throw new Error(ERROR_FORMAT_MSG)
    }
    return result
  }

  getValueFromText(content: string) {
    try {
      // 尝试直接解析JSON
      return JSON.parse(content);
    } catch (e) {
      // 如果是Markdown格式，尝试提取JSON代码块
      const markdownJsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      const matchResult = markdownJsonMatch?.[1] as string
      if (markdownJsonMatch) {
        try {
          return JSON.parse(matchResult);
        } catch (e) {
          try {
            const fixedJson = matchResult.replace(/([\w\d]+):/g, '"$1":').replace(/'/g, '"'); // 修复JSON格式
            return JSON.parse(fixedJson);
          } catch (e) {
            throw new Error(ERROR_FORMAT_MSG);
          }
        }
      }
    }
  }
}