import traverse, { NodePath } from "@babel/traverse";
import * as parser from "@babel/parser"
import type { ILoaderOptions } from "../types/index.ts";
import { BaseUtils } from "./base.ts";
import { type TemplateLiteral, type Expression, type CallExpression, isExpression } from "@babel/types";
import generate from "@babel/generator";
const setupReg = /setup\s*\([^)]*\)\s*{/;
const commonCachedTypes = ['withDefaults', 'defineProps']
export class ScriptLoader extends BaseUtils {
  isSetup: boolean = false;
  tempCache: Record<string, string> = {};
  path: string = ''
  constructor(options: ILoaderOptions, path: string = '') {
    super(options);
    this.path = path
  }

  excute(content: string, isSetup: boolean = false) {
    this.isSetup = isSetup;
    content = this.processNote(content);
    return content;
  }

  private processNote(content: string): string {
    let hasReplace = false;
    // 处理特殊类型，例如defineProps、withDefaults等
    if(this.options.vueVersion === 'vue3') {
      content = commonCachedTypes.reduce((prev:string, type:string) => {
        return this.processCachedTypes(prev, type);
      }, content);
    }
    //对包含中文的部分进行替换操作
    content = this.extractChineseFromCode(content, () => hasReplace = true);
    // 注入替换函数
    if (this.options.needReplace && hasReplace) {
      content = this.injectInstance(content);
    }
    //换回缓存部分
    const matchStr = `(${commonCachedTypes.join('|')})`
    content = content.replace(new RegExp(`'comment_${matchStr}_\\d+_comment'`, 'gim'), (match: string) => {
      return this.tempCache[match] || match;
    });

    return content;
  }

  private extractChineseFromCode(code: string, setHasReplace: () => void) {
    const that = this;
    try {
      const ast = parser.parse(code, {
        sourceType: "module",
        plugins: ['typescript']
      });
      const traverseFunction = typeof traverse === 'function' ? traverse : traverse.default;
      traverseFunction(ast, {
        StringLiteral(path) {
          if (that.isInTypeDefinition(path)) return
          const stringValue = path.node.value;
          if (/[\u4e00-\u9fa5]/.test(stringValue)) {
            const { statement, hasReplace } = that.getTransformValue(`"${stringValue}"`, '"', false);
            if(hasReplace) {
              const key = statement.match(/\$t\((['"])(.*)\1.*\)/)?.[2];
              if(key) {
                path.replaceWith(that.createTCallNode(key))
                setHasReplace()
              }
            }
          }
        },
        TemplateLiteral(path) {
          if (that.isInTypeDefinition(path)) return
          const fullRawContent = that.getTemplateRawContent(path.node)
          if (/[\u4e00-\u9fa5]/.test(fullRawContent)) {
            const { statement, hasReplace } = that.getTransformValue(`\`${fullRawContent}\``);
            if(hasReplace) {
              const key = statement.match(/\$t\((['"])(.*)\1.*\)/)?.[2];
              if(key) {
                const validArgs = path.node.expressions.filter((expr: any): expr is Expression => {
                  return isExpression(expr); // 仅保留 Expression 类型
                })
                path.replaceWith(that.createTCallNode(key, validArgs))
                setHasReplace()
              }
            }
          }
        }
      });
      const { code: modifiedCode } = (generate as any)
      (ast,{ 
        retainLines: true,      // 保持原始行号
        comments: false,        // 不保留注释
        compact: false,         // 不压缩代码
        minified: false,        // 不进行压缩优化
        sourceMaps: false,      // 不需要source map
        // 添加ESLint友好的格式化选项
        semicolons: true,       // 确保语句末尾有分号
        quotes: "double",       // 使用双引号（根据ESLint常见配置）
        wrapColumn: 80,
        indent: {
          style: "  ",          // 2个空格缩进
          adjustMultilineComment: true // 调整多行注释缩进
        },
      })
      return modifiedCode;
    } catch (error:any) {
      console.error(`script/js模块解析失败：${that.path}\n原因：${error.message}`);
      return code
    }
  }

  // 判断一个节点是否位于 TypeScript 类型定义中
  private isInTypeDefinition(path: NodePath): boolean {
    let current: NodePath | null = path;
    const typeNodeTypes = [
      // 接口和类型别名
      "InterfaceDeclaration",
      "TypeAliasDeclaration",
      "TSInterfaceDeclaration",
      "TSTypeAliasDeclaration",
      // 类型签名和成员
      "TSPropertySignature",
      "TSMethodSignature",
      "TSParameterProperty",
      // 类型注解和断言
      "TSTypeAnnotation",
      "TSTypeAssertion",
      "TSAsExpression",
      // 泛型相关
      "TSGenericTypeAnnotation",
      "TS type Reference",
      // 类型字面量
      "TSTypeLiteral",
      "TSStringLiteral",
      "TSNumberLiteral",
    ];
    while (current) {
      const type = current.node.type
      if (
        typeNodeTypes.includes(type)
      ) {
        return true;
      }
      current = current.parentPath;
    }
    return false;
  }

  /**
   * 还原模板字符串的完整原始内容（包含插值表达式）
   * @param {object} templateLiteral
   * @returns {string}
  */
  private getTemplateRawContent(templateLiteral: TemplateLiteral): string {
    let rawContent = "";
    const { quasis, expressions } = templateLiteral;
    const exprCodes = expressions.map((exprNode) => {
      const { code: exprCode } = (generate as any)(exprNode);
      return exprCode;
    });

    for (let i = 0; i < quasis.length; i++) {
      rawContent += quasis[i]?.value.raw || ''
      if (i < expressions.length) {
        rawContent += `\${${exprCodes[i]}}`
      }
    }

    return rawContent;
  }

  /**
   * 生成 $t 调用的 AST 节点（支持可选参数数组）
   * @param key 国际化 key（如 'asbldf'）
   * @param args 可选参数数组（如 [this.data, user.data.a] 的 AST 节点）
   * @returns CallExpression 节点（$t('key', [args...])）
   */
  private createTCallNode(key: string, args?: Expression[]): CallExpression {
    const callArgs: Expression[] = [
      { type: "StringLiteral", value: key }, // 第一个参数：key
    ];

    if (args && args.length > 0) {
      callArgs.push({
        type: "ArrayExpression",
        elements: args,
      });
    }

    return {
      type: "CallExpression",
      callee: { type: "Identifier", name: "$t" }, // 函数名：$t
      arguments: callArgs,
    };
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
    return `'comment_${type}_${index}_comment'`;
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
    const matchVue = content.includes("import Vue from 'vue'")
    if (!matchVue) {
      importContent = `\nimport Vue from 'vue';\n`;
    }
    //若未绑定 $t ，则进行绑定
    if (content.indexOf("const $t = _i18n_vue.$t.bind({$i18n: window.global_i18n})") < 0) {
      injectContent = `
        const _i18n_vue = new Vue();
        const $t = _i18n_vue.$t.bind({$i18n: window.global_i18n})\n
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
      importContent = `\nimport { useI18n } from 'vue-i18n';\n`;
    }
    content = `${importContent}${content}`;
    if (content.indexOf("const { t: $t } = useI18n()") < 0) {
      injectContent = `const { t: $t } = useI18n();\n`;
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
}
