import path from "path";
import fs from 'fs'
import { fileOperator } from "../core/fileOperator.ts";
import type { ILoaderOptions } from "../types/index.ts";
import { getDefaultOptions, getVueModule } from "./util.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";

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
  const { targetFiles, outputDir, anchorName = 'zh_cn' } = options;
  const localeFile = path.resolve(outputDir, `${anchorName}.js`);

  await fileOperator.initMessage(localeFile, true);
  const files = fileOperator.getAllFiles(targetFiles);
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
  await fileOperator.writeMessages(outputDir, localeFile, options.exportType)
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
  const options = await getDefaultOptions()
  options.needReplace = false
  checkOptions(options)
  await generateI18nFiles(options)
}