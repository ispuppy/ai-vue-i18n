import path from "path";
import { parse } from "@vue/compiler-sfc";
import type { ILoaderOptions, PluginOption } from "../types/index.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";
import { fileOperator } from "../core/fileOperator.ts";

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
const commonOptions = {
  needReplace: true,
  vueVersion: "vue3" as const,
  loaderType: "vite" as const,
};
export default function vueI18nPlugin(options: ILoaderOptions): PluginOption {
  return {
    name: "vue-i18n-plugin-ai",
    enforce: "pre",
    transform(code: string, filePath: string) {
      try {
        if (!validateFileType(filePath)) {
          return null;
        }
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
          const { descriptor } = parse(code);
          // 处理template
          if (descriptor.template) {
            const templateLoader = new TemplateLoader(commonOptions);
            const result = templateLoader.excute(descriptor.template.content);
            code = code.replace(descriptor.template.content, result);
          }
          // 处理script
          if (descriptor.script) {
            const scriptLoader = new ScriptLoader(commonOptions);
            const result = scriptLoader.excute(
              descriptor.script.content,
              false
            );
            code = code.replace(descriptor.script.content, result);
          }
          if (descriptor.scriptSetup) {
            const scriptLoader = new ScriptLoader(commonOptions);
            const result = scriptLoader.excute(
              descriptor.scriptSetup.content,
              true
            );
            code = code.replace(descriptor.scriptSetup.content, result);
          }
          console.log(descriptor);
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
