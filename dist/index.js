import path from 'path';
import { f as fileOperator, v as validateFileType, S as ScriptLoader, g as getVueModule, T as TemplateLoader } from './script-loader-B4WC5WYH.js';
import 'assert';
import 'module';
import 'events';
import 'node:fs';
import 'node:fs/promises';
import 'node:os';
import 'node:path';
import 'node:url';
import 'node:worker_threads';
import 'os';
import 'node:util';
import 'crypto';
import 'fs';
import 'util';
import 'node:module';
import 'node:assert';
import 'url';
import 'tty';

function vueI18nPlugin() {
    return {
        name: "vue-i18n-plugin-ai",
        enforce: "pre",
        async transform(code, filePath) {
            try {
                const commonOptions = await fileOperator.getConfig();
                if (!validateFileType(filePath, commonOptions)) {
                    return null;
                }
                // 初始化语言包
                const resourcePath = path.normalize(filePath);
                const localeFile = path.normalize(path.join(commonOptions.outputDir, `${commonOptions.anchorName}.js`));
                await fileOperator.initMessage(localeFile);
                if (!fileOperator.messages) {
                    return { code };
                }
                // 处理js文件
                if ([".js", ".ts", ".cjs"].includes(path.extname(resourcePath))) {
                    const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
                    code = scriptLoader.excute(code, false);
                    return { code };
                }
                // 处理vue文件
                else if (filePath.endsWith(".vue")) {
                    const { template, script, scriptSetup } = getVueModule(code, commonOptions.vueVersion);
                    // 处理template
                    if (template) {
                        const templateLoader = new TemplateLoader(commonOptions, resourcePath);
                        const result = templateLoader.excute(template);
                        code = code.replace(template, result);
                    }
                    // 处理script
                    if (script) {
                        const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
                        const result = scriptLoader.excute(script, false);
                        code = code.replace(script, result);
                    }
                    if (scriptSetup) {
                        const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
                        const result = scriptLoader.excute(scriptSetup, true);
                        code = code.replace(scriptSetup, result);
                    }
                    return { code };
                }
                else {
                    return { code };
                }
            }
            catch (err) {
                console.error("vue3-i18n-plugin error:", err);
                return null;
            }
        },
    };
}

async function loaderForWebpack(content) {
    const callBack = this.async();
    try {
        const filePath = this.resourcePath;
        const commonOptions = await fileOperator.getConfig();
        if (!validateFileType(filePath, commonOptions)) {
            return callBack(null, content);
        }
        const resourcePath = path.normalize(filePath);
        const localeFile = path.normalize(path.join(commonOptions.outputDir, `${commonOptions.anchorName}.js`));
        await fileOperator.initMessage(localeFile);
        if ([".js", ".ts", ".cjs"].includes(path.extname(resourcePath))) {
            const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
            const result = scriptLoader.excute(content, false);
            return callBack(null, result);
        }
        else if (filePath.endsWith(".vue")) {
            content = content.replace(/(<template[^>]*>)((.)*)<\/template>/gims, (match) => {
                const templateLoader = new TemplateLoader(commonOptions, resourcePath);
                const result = templateLoader.excute(match);
                return `${result}`;
            });
            content = content.replace(/(<script[^>]*>)((.)*)<\/script>/gims, (_, preTag, content) => {
                const scriptLoader = new ScriptLoader(commonOptions, resourcePath);
                const result = scriptLoader.excute(content, false);
                return `${preTag}${result}<\/script>`;
            });
            return callBack(null, content);
        }
        return callBack(null, content);
    }
    catch (error) {
        console.error(error);
        return callBack(error, content);
    }
}

const AIvueI18nPluginForVite = vueI18nPlugin;
const AIvueI18nLoaderForWebpack = loaderForWebpack;

export { AIvueI18nLoaderForWebpack, AIvueI18nPluginForVite, AIvueI18nLoaderForWebpack as default };
