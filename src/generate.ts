import path from "path";
import fs from 'fs'
import { fileOperator } from "../core/fileOperator.ts";
import type { ILoaderOptions } from "../types/index.ts";
import { getVueModule } from "./util.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";
import chalk from "chalk";
import { executeTranslate } from "./ai-translate/translate.ts";

chalk.level = 3
const generateVueFile = (path: string, options: ILoaderOptions) => {
  const code = fs.readFileSync(path, 'utf-8')
  const { template, script, scriptSetup } = getVueModule(code, options.vueVersion);
  if(template) {
    const templateLoader = new TemplateLoader(options)
    templateLoader.excute(template)
  }
  if(script) {
    const scriptLoader = new ScriptLoader(options)
    scriptLoader.excute(script)
  }
  if(scriptSetup) {
    const scriptLoader = new ScriptLoader(options)
    scriptLoader.excute(scriptSetup, true)
  }
}
const generateI18nFiles = async(options: ILoaderOptions) => {
  const { outputDir, anchorName = 'zh_cn' } = options;
  const localeFile = path.resolve(outputDir, `${anchorName}.js`);

  await fileOperator.initMessage(localeFile, options.clearInexistence);
  const files = fileOperator.getAllFiles(options);
  for (const file of files) {
    if(file.includes(outputDir)){
      continue;
    }
    if(path.extname(file) === '.vue'){
      generateVueFile(file, options)
    } else {
      const code = fs.readFileSync(file, 'utf-8')
      const scriptLoader = new ScriptLoader(options)
      scriptLoader.excute(code)
    }
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