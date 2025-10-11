import { parse } from '@vue/compiler-sfc';
import type { ILoaderOptions, IVueVersion } from '../types/index.ts';
import { fileOperator } from '../core/fileOperator.ts';
import path from 'path';

export const defaultOptions: ILoaderOptions = {
  vueVersion: 'vue3',
  loaderType: 'vite',
  providerType: 'OPENAI',
  model: '',
  baseURL: '',
  apiKey: '',
  temperature: 0.2,
  needReplace: true,
  chunkSize: 20,
  targetFiles: [],
  outputDir: path.resolve(process.cwd(), 'src/locale'),
  anchorName: 'zh_cn',
  exportType: 'ESM',
  translateList: [],
}

const mergeOptions = (defaultOptions: ILoaderOptions, config: Partial<ILoaderOptions>): ILoaderOptions => {
  const result:ILoaderOptions = { ...defaultOptions }
  for (const key in config) {
    if (Reflect.has(config, key)) {
      const typedKey = key as keyof ILoaderOptions;
      const configValue = config[typedKey];
      if (configValue !== undefined && configValue !== null && configValue !== '') {
        (result as any)[typedKey] = configValue;
      }
    }
  }
  return result
}

export const getDefaultOptions = async(): Promise<ILoaderOptions> => {
  const config = await fileOperator.getConfig()
  if(!config) throw new Error('ai-vue-i18n config not found')
  return mergeOptions(defaultOptions, config)
}

export const getVueModule = (code:string, vueVersion: IVueVersion) => {
  if(vueVersion === 'vue3'){
    const { descriptor } = parse(code);
    return {
      template: descriptor.template?.content,
      script: descriptor.script?.content,
      scriptSetup: descriptor.scriptSetup?.content,
    }
  }
  return {
    template: '',
    script: '',
  }
}
