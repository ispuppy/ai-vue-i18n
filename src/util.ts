import { parse } from '@vue/compiler-sfc';
import type { ILoaderOptions, IVueVersion } from '../types/index.ts';
import { fileOperator } from '../core/fileOperator.ts';
import path from 'path';

const defaultOptions: ILoaderOptions = {
  vueVersion: 'vue3',
  loaderType: 'vite',
  needReplace: true,
  targetFiles: [],
  outputDir: path.resolve(process.cwd(), 'src/locale'),
  anchorName: 'zh_cn',
  exportType: 'ESM',
  translateList: [],
}
export const getDefaultOptions = async(): Promise<ILoaderOptions> => {
  const config = await fileOperator.getConfig()
  if(!config) throw new Error('ai-vue-i18n config not found')
  return {
    ...defaultOptions,
    ...config,
  }
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
