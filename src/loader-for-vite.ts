import path from "path";
import { parse } from "@vue/compiler-sfc";
import type { PluginOption } from "../types/index.js";
import { processTemplate } from "../core/template-loader.js";

const validateFileType = (id: string) => {
  if (id.includes("/node_modules/")) {
    return false;
  }
  const fileTypes = [".vue", ".js", ".ts", "cjs"];
  const ext = path.extname(id);
  if (
    fileTypes.includes(ext) &&
    id === "D:/gitItem/voc-ui-plus/src/pages/date-picker/test.vue"
  ) {
    return true;
  }
  return false;
};

export default function vueI18nPlugin(): PluginOption {
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
          debugger;
          console.log(code);
          // 处理template
          if (descriptor.template) {
            const result = processTemplate(descriptor.template.content);
            code = code.replace(descriptor.template.content, result);
          }
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
