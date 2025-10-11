export interface PluginOption {
  name: string
  enforce: 'pre' | 'post',
  transform(source: string, id: string): Promise<{ code: string } | null>
}

export type IVueVersion = 'vue2' | 'vue3'
export type IProviderType = 'OPENAI' | 'OLLAMA' | 'DEEPSEEK' | 'LMSTUDIO'
export interface ILoaderOptions {
  vueVersion: IVueVersion,
  loaderType: 'webpack' | 'vite',
  providerType: IProviderType,
  model: string,
  baseURL: string,
  apiKey?: string,
  temperature?: number,
  chunkSize: number,
  prompt?: string,
  needReplace: boolean,
  targetFiles: string[] | string,
  excludeFiles?: string[],
  outputDir: string,
  anchorName?: string,
  translateList: {
    name: string,
    fileName: string,
  }[],
  exportType?: 'ESM' | 'CJS',
  whiteList?: string[],
}

export interface IPrompt {
  systemPrompt: string,
  userPrompt: string,
}

export interface ITranslateResult {
  id: number,
  result: Record<string, string>,
}