import { fileOperator } from "core/fileOperator.ts";
import { getVueModule, validateFileType } from "./util.ts";
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
      const scriptLoader = new ScriptLoader(commonOptions);
      const result = scriptLoader.excute(content, false);
      return callBack(null, result);
    } else if (filePath.endsWith(".vue")) {
      content = content.replace(/(<template[^>]*>)((.)*)<\/template>/gims, (_, preTag, content) => {
        const templateLoader = new TemplateLoader(commonOptions);
        const result = templateLoader.excute(content);
        return `${preTag}${result}<\/template>`
      })
      content = content.replace(/(<script[^>]*>)((.)*)<\/script>/gims, (_, preTag, content) => {
        const scriptLoader = new ScriptLoader(commonOptions);
        const result = scriptLoader.excute(content, false);
        return `${preTag}${result}<\/script>`
      })
      /* const { template, script } = getVueModule(
        content,
        commonOptions.vueVersion,
      );
      if (template) {
        const templateLoader = new TemplateLoader(commonOptions);
        const result = templateLoader.excute(template);
        content = content.replace(template, result);
      }
      if (script) {
        const scriptLoader = new ScriptLoader(commonOptions);
        const result = scriptLoader.excute(script, false);
        content = content.replace(script, result);
      } */
      return callBack(null, content);
    }
    return callBack(null, content);
  } catch (error) {
    console.error(error);
    return callBack(error, content);
  }
}
