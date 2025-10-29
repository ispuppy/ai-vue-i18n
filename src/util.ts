import { parse } from '@vue/compiler-sfc';
import type { ILoaderOptions, IVueVersion } from '../types/index.ts';
import path from 'path';


export const defaultOptions: ILoaderOptions = {
  vueVersion: 'vue3',
  providerType: 'OPENAI',
  model: '',
  baseURL: '',
  apiKey: '',
  temperature: 0.2,
  needReplace: true,
  clearInexistence: false,
  chunkSize: 20,
  parallerSize: 10,
  targetFiles: [],
  outputDir: path.resolve(process.cwd(), 'src/locale'),
  anchorName: 'zh_cn',
  exportType: 'ESM',
  translateList: [],
}

export const mergeOptions = (config: Partial<ILoaderOptions>): ILoaderOptions => {
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

export const getVueModule = (code:string, vueVersion: IVueVersion) => {
  if(vueVersion === 'vue3'){
    const { descriptor } = parse(code);
    return {
      template: descriptor.template?.content,
      script: descriptor.script?.content,
      scriptSetup: descriptor.scriptSetup?.content,
    }
  }
  const [templateContent = ''] = code.match(/<template[^>]*>((.)*)<\/template>/ims) || []
  //获取script部分
  const [, scriptContent = ''] = code.match(/<script[^>]*>((.)*)<\/script>/ims) || []
  return {
    template: templateContent,
    script: scriptContent,
    scriptSetup: '',
  }
}

export const validateFileType = (filePath: string, options: ILoaderOptions, isDirectory?: boolean) => {
  filePath = path.normalize(filePath)
  if (filePath.includes("node_modules")) {
    return false;
  }
  let { outputDir, excludeFiles = [] } = options;
  outputDir = path.normalize(outputDir)
  excludeFiles = excludeFiles.map(item => path.normalize(item))
  let targetFiles = options.targetFiles
  if(filePath.includes(outputDir)) {
    return false;
  }
  if(!Array.isArray(targetFiles)) {
    targetFiles = [targetFiles]
  }
  targetFiles = targetFiles.map(item => path.normalize(item))
  if(targetFiles.every(item => !filePath.includes(item))) {
    return false;
  }
  if(excludeFiles.some(item => filePath.includes(item))) {
    return false;
  }
  if(isDirectory) {
    return true;
  }
  const fileTypes = [".vue", ".js", ".ts", "cjs"];
  const ext = path.extname(filePath);
  if (fileTypes.includes(ext) && !(ext === ".ts" && filePath.endsWith(".d.ts"))) {
    return true;
  }
  return false;
};

export const requestPool = (poolSize: number) => {
  const requestQueue: Array<() => void> = []
  let runningCount = 0
  const executeRequest = async (request: () => Promise<any>) => {
    return new Promise((resolve, reject) => {
      const newRequest = () => {
        Promise.resolve(request()).then((result) => {
          resolve(result)
        }).catch((err) => {
          reject(err)
        }).finally(() => {
          runningCount--
          if(requestQueue.length) {
            const nexRequest = requestQueue.shift()!
            runningCount++
            nexRequest()
          }
        })
      }
      if(runningCount >= poolSize) {
        return requestQueue.push(newRequest)
      }
      runningCount++
      newRequest()
    })
  }
  return executeRequest
}
