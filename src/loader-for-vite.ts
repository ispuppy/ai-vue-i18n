import path from "path";
import { parse } from "@vue/compiler-sfc";
import type { ILoaderOptions, PluginOption } from "../types/index.ts";
import { TemplateLoader } from "../core/template-loader.ts";
import { ScriptLoader } from "../core/script-loader.ts";  

const validateFileType = (id: string) => {
  if (id.includes("/node_modules/")) {
    return false;
  }
  const fileTypes = [".vue", ".js", ".ts", "cjs"];
  const ext = path.extname(id);
  if (
    fileTypes.includes(ext) &&
    id === "D:/gitItem/voc-ui-plus/src/components/Test.vue"
  ) {
    return true;
  }
  return false;
};
const commonOptions = {
  needReplace: false,
  vueVersion: 'vue3',
  loaderType: 'vite',
}
export default function vueI18nPlugin(options: ILoaderOptions): PluginOption {
  return {
    name: "vue-i18n-plugin-ai",
    enforce: "pre",
    transform(source: string, id: string) {
      try {
        if (!validateFileType(id)) {
          return null;
        }
        // 处理vue文件
        if (id.endsWith(".vue")) {
          const { descriptor } = parse(source);
          let code = source;
          // 处理template
          if (descriptor.template) {
            const templateLoader = new TemplateLoader(commonOptions)
            const result = templateLoader.excute(descriptor.template.content);
            code = code.replace(descriptor.template.content, result);
          }
          // 处理script
          if (descriptor.script) {
            const scriptLoader = new ScriptLoader(commonOptions)
            const result = scriptLoader.excute(descriptor.script.content);
            code = code.replace(descriptor.script.content, result);
          }
          console.log(descriptor)
          return { code };
        }

        return null;
      } catch (err) {
        console.error("vue3-i18n-plugin error:", err);
        return null;
      }
    },
  };
}
