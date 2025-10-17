import type { ILoaderOptions, IPrompt, ITranslationLog } from "@types"
import AIProvider from "./providers/index.ts"
import { fileOperator, type MessageType } from "core/fileOperator.ts"
import path from "path"
import chalk from "chalk"
import { getTranslatePrompt } from "./prompt.ts"
import { requestPool } from "@/util.ts"

interface IChunk {
  keys: string[];
  languages: string[];
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
  const languagesFileContent: Record<string, MessageType> = {};
  for (const { fileName } of options.translateList) {
    const filePath = path.resolve(options.outputDir, `${fileName}.js`);
    try {
      const translated: Record<string, string> = await fileOperator.getFileContent(filePath);
      languagesFileContent[fileName] = translated || {}
    } catch (error) {
      console.error(`Error loading translation file ${fileName}:`, error);
    }
  }
  fileOperator.setTotalTranslateMessages(languagesFileContent, options.clearInexistence)
  return languagesFileContent
}

// 为每个键收集需要翻译的语言
const getkeyLanguageMap = (options: ILoaderOptions, languagesFiles: Record<string, MessageType>) => {
  const translationLog = fileOperator.loadTranslationCache(options.outputDir)
  const keyLanguageMap: Record<string, string[]> = {};
  const { translateList } = options;
  const messages = fileOperator.messages;
  if (!messages) {
    console.log(chalk.yellow('No messages need to translate'))
    process.exit(0)
  }
  for (const key of Object.keys(messages)) {
    const missingLanguages: string[] = [];
    
    for (const { fileName } of translateList) {
      const translated = languagesFiles[fileName];
      if (!translated?.[key]) {
        const cachedItem = translationLog[key]
        const cacheValue = cachedItem?.[fileName]
        if (cacheValue) {
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
  return keyLanguageMap
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
  const languagesFiles = await getLanguagesFiles(options)
  const keyLanguageMap = getkeyLanguageMap(options, languagesFiles)
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

  return chunks;
}

const getPrompt = (keyItems: { id: string, text: string }[], languageNames: string[], prompt: string = ''): IPrompt => {
  const systemPrompt = '你是一个专业的翻译，将用户输入的文本翻译成指定的语言。' + prompt

  const userPrompt = getTranslatePrompt(JSON.stringify(keyItems), JSON.stringify(languageNames))
  
  return {
    systemPrompt,
    userPrompt
  }
}

const getTranslatePromise = (analyzePromise: Promise<any>, languages: string[]) => {
  return new Promise((resolve, reject) => {
    Promise.resolve(analyzePromise).then((list) => {
      for(const item of list) {
        const { id, results } = item
        if(results.length !== languages.length) {
          console.log(chalk.yellow(`id: ${id} 的翻译结果数量与语言数量不一致`))
          continue
        }
        results.forEach((text: string, index: number) => {
          const lang = languages[index]!
          fileOperator.updateTranslateMessages(lang, id, text)
        })
      }

      resolve(list)
    }).catch(reject)
  })
}
export const executeTranslate = async (options: ILoaderOptions) => {
  validateConfig(options)
  const chunks = await getChunks(options)
  const messages = fileOperator.messages
  const provider = AIProvider.create(options)
  const executeRequest = requestPool(Math.max(1, options.parallerSize))
  const promiseList: Promise<any>[] = []

  const totalKeys = chunks.reduce((acc, cur) => acc + cur.keys.length, 0)
  console.log(chalk.green(`本次翻译分${chunks.length}组进行请求，共${totalKeys}个翻译项`))
  for (const chunk of chunks) {
    const { keys, languages } = chunk
    const keyItems = keys.map(key => ({ id: key, text: messages![key] })) as { id: string, text: string }[]
    const languageNames = languages.map(lang => options.translateList.find(item => item.fileName === lang)?.name) as string[]
    const prompt = getPrompt(keyItems, languageNames, options.prompt)
    const translatePromise = getTranslatePromise(provider.analyze(prompt), languages)
    promiseList.push(executeRequest(translatePromise))
  }
  await Promise.all(promiseList)
  fileOperator.saveLanguageFiles(options.outputDir, options.exportType)
  console.log(chalk.green(`翻译完成，已保存到 ${options.outputDir}`))
}
