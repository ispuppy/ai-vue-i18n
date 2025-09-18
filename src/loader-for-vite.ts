import path from "path";
import { parse } from "@vue/compiler-sfc";
import type { loaderOptions, PluginOption } from "../types/index.ts";
import { templateLoader } from "../core/template-loader.ts";

const validateFileType = (id: string) => {
  if (id.includes("/node_modules/")) {
    return false;
  }
  const fileTypes = [".vue", ".js", ".ts", "cjs"];
  const ext = path.extname(id);
  if (
    fileTypes.includes(ext) &&
    id === "D:/gitItem/voc-ui-plus/src/components/HelloWorld.vue"
  ) {
    return true;
  }
  return false;
};

export default function vueI18nPlugin(options: loaderOptions): PluginOption {
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
            const result = templateLoader.excute(descriptor.template.content, options);
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
