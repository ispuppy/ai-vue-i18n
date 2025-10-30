import path from "path";
import fs from 'fs'
import { fileOperator } from "../core/fileOperator.ts";
import type { ILoaderOptions } from "../types/index.ts";
import { getVueModule } from "./util.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";
import chalk from "chalk";
import { executeTranslate, getkeyLanguageMap, type IGetKeyLanguageMapResult } from "./ai-translate/translate.ts";

chalk.level = 3
const generateVueFile = (path: string, options: ILoaderOptions) => {
  try {
    const code = fs.readFileSync(path, 'utf-8')
    const { template, script, scriptSetup } = getVueModule(code, options.vueVersion);
    if(template) {
      const templateLoader = new TemplateLoader(options, path)
      templateLoader.excute(template)
    }
    if(script) {
      const scriptLoader = new ScriptLoader(options, path)
      scriptLoader.excute(script)
    }
    if(scriptSetup) {
      const scriptLoader = new ScriptLoader(options, path)
      scriptLoader.excute(scriptSetup, true)
    }
  } catch (error: any) {
    console.log(chalk.red(`解析文件过程发生错误: ${path}\n原因：${error.message}`))
  }
}
const generateI18nFiles = async(options: ILoaderOptions, writeMessage: boolean = true) => {
  let { outputDir, anchorName = 'zh_cn' } = options;
  outputDir = path.normalize(outputDir)
  const localeFile = path.resolve(outputDir, `${anchorName}.js`);

  await fileOperator.initMessage(localeFile, options.clearInexistence);
  const files = fileOperator.getAllFiles(options);
  for (let file of files) {
    file = path.normalize(file)
    if(file.includes(outputDir)){
      continue;
    }
    if(path.extname(file) === '.vue'){
      generateVueFile(file, options)
    } else {
      const code = fs.readFileSync(file, 'utf-8')
      const scriptLoader = new ScriptLoader(options, file)
      scriptLoader.excute(code)
    }
  }
  if(!writeMessage) {
    return
  }
  await fileOperator.writeMessages(outputDir, localeFile, options.exportType, fileOperator.messages)
  console.log(chalk.green(`中文语言包生成完毕 ➤ ${localeFile}`))
}

const checkOptions = (options: ILoaderOptions) => {
  const { targetFiles, outputDir, translateList } = options;
  if(!outputDir) {
    throw new Error('outputDir is required')
  }
  if(!targetFiles) {
    throw new Error('targetFiles is required')
  }
  if(!translateList || translateList.length === 0) {
    throw new Error('translateList is required')
  }
}

export const generate = async() => {
  try {
    const options = await fileOperator.getConfig(true)
    options.needReplace = false
    checkOptions(options)
    await generateI18nFiles(options)
    await executeTranslate(options)
  } catch (error: any) {
    console.log(chalk.red(error.message))
    process.exit(0)
  }
}

export const checkMessage = async(): Promise<IGetKeyLanguageMapResult | null> => {
  try {
    const options = await fileOperator.getConfig(true)
    options.needReplace = false
    checkOptions(options)
    await generateI18nFiles(options, false)
    const res = await getkeyLanguageMap(options, true)
    if(res) {
      console.log(chalk.cyan('所有中文均已翻译'))
    } else {
      console.log(chalk.yellow('存在中文未翻译，请执行 i18n-translate 命令进行翻译'))
    }
    return res
  } catch (error: any) {
    console.log(chalk.red(error.message))
    return {} as IGetKeyLanguageMapResult
  }
}