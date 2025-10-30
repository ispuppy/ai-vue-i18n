import type { ILoaderOptions, IPrompt, ITranslationLog } from "@types"
import AIProvider from "./providers/index.ts"
import { fileOperator, type ILanguageFiles, type MessageType } from "core/fileOperator.ts"
import path from "path"
import chalk from "chalk"
import { getTranslatePrompt } from "./prompt.ts"
import { requestPool } from "@/util.ts"

interface IChunk {
  keys: string[];
  languages: string[];
}

export interface IGetKeyLanguageMapResult {
  keyLanguageMap: Record<string, string[]>;
  useCache: boolean;
}
const validateConfig = (config: ILoaderOptions) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object')
  }
  const whiteList = ['LMSTUDIO', 'OLLAMA']
  const providerType = config.providerType.toUpperCase();
  if(!config.apiKey && !whiteList.includes(providerType)) {
    throw new Error('apiKey is required in config')
  } 
}

// 加载所有需要翻译的语言文件
const getLanguagesFiles = async (options: ILoaderOptions) => {
  const languagesFileContent: ILanguageFiles = {};
  for (const { fileName } of options.translateList) {
    const filePath = path.resolve(options.outputDir, `${fileName}.js`);
    try {
      const { exportType, content: translated } = await fileOperator.getFileContent(filePath) || {}
      languagesFileContent[fileName] = {
        messages: translated || {},
        update: false,
        exportType,
      }
    } catch (error) {
      console.error(`Error loading translation file ${fileName}:`, error);
    }
  }
  fileOperator.setTotalTranslateMessages(languagesFileContent, options.clearInexistence)
  return languagesFileContent
}


export async function getkeyLanguageMap(options: ILoaderOptions, check: true): Promise<IGetKeyLanguageMapResult | null>;
export async function getkeyLanguageMap(options: ILoaderOptions, check?: false): Promise<IGetKeyLanguageMapResult>
// 为每个键收集需要翻译的语言
export async function getkeyLanguageMap(options: ILoaderOptions, check: boolean = false): Promise<IGetKeyLanguageMapResult | null> {
  const messages = fileOperator.messages;
  let useCache = false
  const keyLanguageMap: Record<string, string[]> = {};
  if (!messages) {
    return {
      keyLanguageMap,
      useCache
    }
  }
  const translationLog = fileOperator.loadTranslationCache(options.outputDir)
  const { translateList } = options;
  const languagesFiles = await getLanguagesFiles(options)
  for (const key of Object.keys(messages)) {
    const missingLanguages: string[] = [];
    
    for (const { fileName } of translateList) {
      const fileItem = languagesFiles[fileName];
      const { messages: translated } = fileItem || {}
      if (!translated?.[key]) {
        if(check) {
          return null
        }
        const cachedItem = translationLog[key]
        const cacheValue = cachedItem?.[fileName]
        if (cacheValue) {
          useCache = true
          fileOperator.updateTranslateMessages(fileName, key, cacheValue)
          continue
        }
        missingLanguages.push(fileName);
      }
    }
    
    if (missingLanguages.length > 0) {
      keyLanguageMap[key] = missingLanguages;
    }
  }
  return {
    keyLanguageMap,
    useCache
  }
}

// 按需要翻译语言组合分组
const getLanguageGroups = (keyLanguageMap: Record<string, string[]>) => {
  const languageGroups: Record<string, string[]> = {};

  Object.entries(keyLanguageMap).forEach(([key, languages]) => {
    const languageKey = languages.sort().join(',');
    
    if (!languageGroups[languageKey]) {
      languageGroups[languageKey] = [];
    }
    
    languageGroups[languageKey].push(key);
  });
  return languageGroups
}

const getChunks = async (options: ILoaderOptions) => {
  const { keyLanguageMap, useCache} = await getkeyLanguageMap(options)
  const languageGroups = getLanguageGroups(keyLanguageMap)

  const chunkSize = options.chunkSize || 20;
  const chunks: IChunk[] = [];

  for (const [languageKey, keys] of Object.entries(languageGroups)) {
    const languages = languageKey.split(',');
    
    for (let i = 0; i < keys.length; i += chunkSize) {
      const keysValue = keys.slice(i, Math.min(keys.length, i + chunkSize))
      chunks.push({
        keys: keysValue,
        languages
      })
    }
  }

  return { chunks, useCache};
}

const getPrompt = (keyItems: { id: string, text: string }[], languageNames: string[], prompt: string = ''): IPrompt => {
  const systemPrompt = '你是一个专业的翻译，将用户输入的文本翻译成指定的语言。' + prompt

  const userPrompt = getTranslatePrompt(JSON.stringify(keyItems), JSON.stringify(languageNames))
  
  return {
    systemPrompt,
    userPrompt
  }
}

const getTranslatePromise = (analyzePromise: Promise<any>, chunk: IChunk, count: { successCount: number, failCount: number, totalCount: number }) => {
  return new Promise((resolve, reject) => {
    Promise.resolve(analyzePromise).then((list) => {
      for(const item of list) {
        const { id, results } = item
        if(results.length !== chunk.languages.length) {
          console.log(chalk.yellow(`id: ${id} 的翻译结果数量与语言数量不一致`))
          continue
        }
        results.forEach((text: string, index: number) => {
          const lang = chunk.languages[index]!
          fileOperator.updateTranslateMessages(lang, id, text)
          fileOperator.updateTranslationCache(id, lang, text)
        })
      }

      resolve(list)
      count.successCount += 1
    }).catch((error) => {
      reject(error)
      console.log(chalk.redBright(`翻译失败: 原因-${error.message}\n失败项:${chunk.keys.join(',')}`))
      count.failCount += 1
    }).finally(() => {
      const finishedCount = count.successCount + count.failCount
      const process = `${(finishedCount / count.totalCount * 100).toFixed(2)}%`
      console.log(chalk.green(`进度 ${process}`))
    })
  })
}

export const executeTranslate = async (options: ILoaderOptions) => {
  try {
    validateConfig(options)
    const { chunks, useCache} = await getChunks(options)
    const messages = fileOperator.messages
    const provider = AIProvider.create(options)
    const executeRequest = requestPool(Math.max(1, options.parallerSize))
    const promiseList: Promise<any>[] = []
    const totalKeys = chunks.reduce((acc, cur) => acc + cur.keys.length, 0)
    const count = { successCount: 0, failCount: 0, totalCount: chunks.length }
    
    if(chunks.length) {
      if(useCache) {
        console.log(chalk.cyan('部分项从日志文件获取，其他项请求AI'))
      }
      console.log(chalk.cyan(`本次翻译分${chunks.length}组进行请求，共${totalKeys}个翻译项`))
    } else if(useCache) {
      console.log(chalk.cyan('本次翻译均从日志文件获取，无需请求AI'))
    } else {
      console.log(chalk.cyan('未发现需要翻译的项'))
      process.exit(0)
    }
    for (const chunk of chunks) {
      const { keys, languages } = chunk
      const keyItems = keys.map(key => ({ id: key, text: messages![key] })) as { id: string, text: string }[]
      const languageNames = languages.map(lang => options.translateList.find(item => item.fileName === lang)?.name) as string[]
      const prompt = getPrompt(keyItems, languageNames, options.systemPrompt)
      const translatePromise = () => getTranslatePromise(provider.analyze(prompt), chunk, count)
      promiseList.push(executeRequest(translatePromise))
    }
    await Promise.allSettled(promiseList)
    fileOperator.saveLanguageFiles(options.outputDir, options.exportType)
    fileOperator.saveTranslationCache(options.outputDir)
    count.successCount && console.log(chalk.green(`成功翻译 ${count.successCount} 个项`))
    count.failCount && console.log(chalk.redBright(`翻译失败 ${count.failCount} 个项，请重新翻译`))
    if (count.successCount || useCache) {
      console.log(chalk.green(`翻译文件已保存到 ${options.outputDir}`))
    }
  } catch (error: any) {
    console.log(chalk.redBright(error.message))
    process.exit(0)
  }
}
