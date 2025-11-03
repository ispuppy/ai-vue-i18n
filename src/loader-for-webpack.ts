import { fileOperator } from "core/fileOperator.ts";
import { validateFileType } from "./util.ts";
import path from "path";
import { ScriptLoader } from "core/script-loader.ts";
import { TemplateLoader } from "core/template-loader.ts";

export default async function loaderForWebpack(this: any, content: string) {
   const callBack = this.async();
  try {
    const filePath = this.resourcePath;
    const commonOptions = await fileOperator.getConfig();
    if (!validateFileType(filePath, commonOptions)) {
      return callBack(null, content);
    }
    const resourcePath = path.normalize(filePath);
    const localeFile = path.normalize(
      path.join(commonOptions.outputDir, `${commonOptions.anchorName}.js`)
    );
    await fileOperator.initMessage(localeFile);
    if (
      [".js", ".ts", ".cjs"].includes(path.extname(resourcePath))) {
      const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
      const result = scriptLoader.excute(content, false);
      return callBack(null, result);
    } else if (filePath.endsWith(".vue")) {
      content = content.replace(/(<template[^>]*>)((.)*)<\/template>/gims, (match: string) => {
        const templateLoader = new TemplateLoader(commonOptions, resourcePath);
        const result = templateLoader.excute(match);
        return `${result}`
      })
      content = content.replace(/(<script[^>]*>)((.)*)<\/script>/gims, (_, preTag, content) => {
        const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
        const result = scriptLoader.excute(content, false);
        return `${preTag}${result}<\/script>`
      })
      
      return callBack(null, content);
    }
    return callBack(null, content);
  } catch (error) {
    console.error(error);
    return callBack(error, content);
  }
}
