import type { ILoaderOptions } from "../types/index.ts";
import { BaseUtils } from "./base.ts";
const setupReg = /setup\s*\([^)]*\)\s*{/;
const commonCachedTypes = ['comment', 'withDefaults', 'defineProps']
export class ScriptLoader extends BaseUtils {
  isSetup: boolean = false;
  tempCache: Record<string, string> = {};
  constructor(options: ILoaderOptions) {
    super(options);
  }
  excute(content: string, isSetup: boolean = false) {
    this.isSetup = isSetup;
    content = this.processNote(content);
    return content;
  }

  private processNote(content: string): string {
    let hasReplace = false;
    // 处理特殊类型，例如注释、defineProps、withDefaults等
    content = commonCachedTypes.reduce((prev:string, type:string) => {
      return this.processCachedTypes(prev, type);
    }, content);
    //对包含中文的部分进行替换操作
    content = content.replace(
      /(['"`])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gm,
      (value) => {
        const { statement, hasReplace: hasReplaceItem } =
          this.getTransformValue(value);
        hasReplace = hasReplace || hasReplaceItem;
        return statement;
      }
    );
    // 注入替换函数
    if (this.options.needReplace && hasReplace) {
      content = this.injectInstance(content);
    }
    //换回缓存部分
    const matchStr = `(${commonCachedTypes.join('|')})`
    content = content.replace(new RegExp(`\\/\\*${matchStr}_\\d+\\*\\/`, 'gim'), (match: string) => {
      return this.tempCache[match] || match;
    });

    return content;
  }

  private processCachedTypes(content: string, type: string): string {
    switch(type) {
      //替换注释部分
      case 'comment':
        return this.processComment(content, type);
      case 'withDefaults':
      case 'defineProps':
        return this.processWithNestType(content, type);
      default:
        return content;
    }
  }

  private getCachedKey(type: string, index: number) {
    return `/*${type}_${index}*/`;
  }
  private processComment(content: string, type: string):string {
    let commentsIndex = 0;
    content = content.replace(
      /(\/\*(\s|\S)*\*\/)|(\/\/.*)/gim,
      (match: string, _p1, _p2, _p3, offset: number, str: string) => {
        //排除掉url协议部分
        if (offset > 0 && str[offset - 1] === ":") return match;
        const commentsKey = this.getCachedKey(type, commentsIndex++);
        this.tempCache[commentsKey] = match;
        return commentsKey;
      }
    );
    return content;
  }

  private processWithNestType(content: string, type: string): string {
    const map: Record<string, string[]> = {
      'withDefaults': ['('],
      'defineProps': ['<', '('],
    }
    let index = 0;
    for (const match of content.matchAll(new RegExp(type, 'gim'))) {
      const defaultKey = this.getCachedKey(type, index++);
      const matchContent = this.getNestSymbolValue(content, map[type], match.index);
      if(!matchContent) continue
      this.tempCache[defaultKey] = matchContent
      content = content.replace(matchContent, defaultKey);
    }
    return content;
  }
  private generateImportModuleTestReg(moduleName: string) {
    return new RegExp(
      `import[\\s\\t]+([^\\s\\t{}]+)[^'"]+["']${moduleName}['"]|(const|let|var)[\\s\\t]+([^\\s\\t{}]+)[^'"]+['"]${moduleName}['"]`,
      "im"
    );
  }
  private injectInstance(content: string): string {
    if (this.options.vueVersion === "vue2") {
      return this.injectInstanceFor2(content);
    }
    return this.injectInstanceFor3(content);
  }

  private injectInstanceFor2(content: string): string {
    let importContent = "";
    let injectContent = "";
    //判断是否注入vue
    let matchVue = content.match(this.generateImportModuleTestReg("vue"));
    let moduleVue = "Vue";
    if (!matchVue) {
      importContent = `import Vue from 'vue';\n`;
    } else {
      moduleVue = matchVue[1] || matchVue[3] || moduleVue;
    }

    //若未绑定 $t ，则进行绑定
    if (content.indexOf("const $t = _i18n_vue.$t.bind({$i18n: window.global_i18n})") < 0) {
      injectContent = `
        const _i18n_vue = new ${moduleVue}();
        const $t = _i18n_vue.$t.bind({$i18n: window.global_i18n})
      `;
    }
    content = `${importContent}${content}`;
    content = this.injectAction(injectContent, content);
    return content;
  }

  private injectInstanceFor3(content: string): string {
    if (this.isSetup) {
      return this.injectForHook(content, false);
    }
    // 检查是否有 setup 函数
    const matchSetup = content.match(setupReg);
    if (matchSetup) {
      return this.injectForHook(content, true);
    }
    return this.injectForScript(content);
  }
  public injectForHook(content: string, matchSetup: boolean): string {
    let importContent = "";
    let injectContent = "";
    const matchReg = /import\s+{.*useI18n.*}\s+from\s+(['"])vue-i18n\1/gs;
    const matchI18n = content.match(matchReg);
    if (!matchI18n) {
      importContent = `\nimport { useI18n } from 'vue-i18n';`;
    }
    content = `${importContent}${content}`;
    if (content.indexOf("const { t: $t } = useI18n()") < 0) {
      injectContent = `const { t: $t } = useI18n()`;
    }

    if (!matchSetup) {
      return this.injectAction(injectContent, content);
    }
    content = content.replace(setupReg, (match) => {
      return `${match}\n${injectContent}`;
    });
    return content;
    // const startIndex = matchSetup.index! + matchSetup[0].length
    // return this.injectForSetup(content, startIndex)
  }

  private injectForScript(content: string): string {
    const injectContent = "const $t = window.global_i18n?.global?.t";
    if (content.indexOf(injectContent) < 0) {
      content = this.injectAction(injectContent, content);
    }
    return content;
  }

  private injectAction(injectContent: string, content: string): string {
    //将引入模块的内容放到内容区的最前面
    let [lastImport] = (
      content.match(/import(?!from).+from(?!from).+;?/gm) || [""]
    ).reverse();
    content = content.replace(lastImport!, (match) => {
      return `
      ${match}\n
      ${injectContent}
      `;
    });
    return content;
  }

  private injectForSetup(content: string, startIndex: number): string {
    let braceCount = 1;
    let endIndex = content.length;
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === "{") {
        braceCount++;
      } else if (content[i] === "}") {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    const beforeCode = content.substring(0, startIndex);
    const afterCode = content.substring(endIndex);
    let setupCode = content.substring(startIndex, endIndex);
    const returnReg = /return\s*\{\s*([^}]*)\}[^{}]*}$/;
    setupCode = setupCode.replace(returnReg, (match, returnCode) => {
      const params = returnCode.split(",");
      if (params.includes("$t")) {
        return match;
      }
      return match.replace(returnCode, `$t,\n${returnCode}`);
    });
    return `${beforeCode}${setupCode}${afterCode}`;
  }
}
