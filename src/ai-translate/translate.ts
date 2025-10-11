import type { ILoaderOptions, IPrompt } from "@types"
import AIProvider from "./providers/index.ts"
import { fileOperator } from "core/fileOperator.ts"
import path from "path"
import chalk from "chalk"
import { getTranslatePrompt } from "./prompt.ts"

type ILanguageFiles = Record<string, Record<string, string>>

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
  const languagesFileContent: ILanguageFiles = {};
  for (const { fileName } of options.translateList) {
    const filePath = path.resolve(options.outputDir, `${fileName}.js`);
    try {
      const translated = await fileOperator.getFileContent(filePath);
      languagesFileContent[fileName] = translated || {}
    } catch (error) {
      console.error(`Error loading translation file ${fileName}:`, error);
    }
  }
  return languagesFileContent
}

// 为每个键收集需要翻译的语言
const getkeyLanguageMap = (options: ILoaderOptions, languagesFiles: ILanguageFiles) => {
  const keyLanguageMap: Record<string, string[]> = {};
  const { translateList } = options;
  const messages = fileOperator.messages;
  if (!messages) {
    console.log(chalk.yellow('No messages need to translate'))
    process.exit(0)
  }
  for (const key of Object.keys(messages)) {
    const missingLanguages: string[] = [];
    
    for (const { fileName, name } of translateList) {
      const translated = languagesFiles[fileName];
      if (!translated?.[key]) {
        missingLanguages.push(name);
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

const getPrompt = (keyNames: string[], languageNames: string[], prompt: string = ''): IPrompt => {
  const systemPrompt = '你是一个专业的翻译，将用户输入的文本翻译成指定的语言。' + prompt

  const structuredData = keyNames.map((text, index) => ({
    id: index + 1,
    text: text
  }));

  const userPrompt = getTranslatePrompt(JSON.stringify(structuredData), JSON.stringify(languageNames))
  
  return {
    systemPrompt,
    userPrompt
  }
}

export const executeTranslate = async (options: ILoaderOptions) => {
  validateConfig(options)
  const chunks = await getChunks(options)
  const messages = fileOperator.messages
  const provider = AIProvider.create(options)
  for (const chunk of chunks) {
    const { keys, languages } = chunk
    const keyNames = keys.map(key => messages![key]) as string[]
    const languageNames = languages.map(lang => options.translateList.find(item => item.fileName === lang)?.name) as string[]
    const prompt = getPrompt(keyNames, languageNames, options.prompt)
    const translated = await provider.analyze(prompt)
    console.log(translated)
  }
}
