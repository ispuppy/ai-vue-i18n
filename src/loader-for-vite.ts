import path from "path";
import type { PluginOption } from "../types/index.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";
import { fileOperator } from "../core/fileOperator.ts";
import { getDefaultOptions, getVueModule } from "./util.ts";

const validateFileType = (id: string) => {
  if (id.includes("/node_modules/")) {
    return false;
  }
  const fileTypes = [".vue", ".js", ".ts", "cjs"];
  const ext = path.extname(id);
  if (
    fileTypes.includes(ext) &&
    [
      "D:/gitItem/voc-ui-plus/src/components/Test.vue",
      "D:/gitItem/voc-ui-plus/src/components/selections.vue",
      "D:/gitItem/voc-ui-plus/src/components/HelloWorld.vue",
    ].includes(id)
  ) {
    return true;
  }
  return false;
};
export default function vueI18nPlugin(): PluginOption {
  return {
    name: "vue-i18n-plugin-ai",
    enforce: "pre",
    async transform(code: string, filePath: string) {
      try {
        if (!validateFileType(filePath)) {
          return null;
        }
        const commonOptions = await getDefaultOptions()
        // 初始化语言包
        const resourcePath = path.normalize(filePath);
        const localeFile = path.normalize(
          path.join(process.cwd(), "src/locale/zh-cn.js")
        );
        fileOperator.initMessage(localeFile);
        if (!fileOperator.messages) {
          return { code };
        }
        // 处理js文件
        if (
          ["js", "ts"].includes(path.extname(resourcePath)) &&
          !resourcePath.includes(path.parse(localeFile).dir)
        ) {
          const scriptLoader = new ScriptLoader(commonOptions);
          code = scriptLoader.excute(code, false);
          return { code };
        }
        // 处理vue文件
        else if (filePath.endsWith(".vue")) {
          const { template, script, scriptSetup } = getVueModule(
            code,
            commonOptions.vueVersion
          );
          // 处理template
          if (template) {
            const templateLoader = new TemplateLoader(commonOptions);
            const result = templateLoader.excute(template);
            code = code.replace(template, result);
          }
          // 处理script
          if (script) {
            const scriptLoader = new ScriptLoader(commonOptions);
            const result = scriptLoader.excute(script, false);
            code = code.replace(script, result);
          }
          if (scriptSetup) {
            const scriptLoader = new ScriptLoader(commonOptions);
            const result = scriptLoader.excute(scriptSetup, true);
            code = code.replace(scriptSetup, result);
          }
          return { code };
        } else {
          return { code };
        }
      } catch (err) {
        console.error("vue3-i18n-plugin error:", err);
        return null;
      }
    },
  };
}
