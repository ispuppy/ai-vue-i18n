import type { ILoaderOptions } from "../types/index.ts";
import { BaseUtils } from "./base.ts";
const setupReg = /setup\s*\([^)]*\)\s*{/

export class ScriptLoader extends BaseUtils {
  isSetup: boolean = false
  constructor(options: ILoaderOptions) {
    super(options);
  }
  excute(content:string, isSetup: boolean) {
    this.isSetup = isSetup
    content = this.processNote(content)
    return content
  }

  private processNote(content: string): string {
    //替换注释部分
    const comments: Record<string, string> = {}
    let commentsIndex = 0
    let hasReplace = false
    content = content.replace(/(\/\*(\s|\S)*\*\/)|(\/\/.*)/gim, (match:string, _p1, _p2, _p3, offset: number, str: string) => {
      //排除掉url协议部分
      if (offset > 0 && str[offset - 1] === ':') return match
      let commentsKey = `/*comment_${commentsIndex++}*/`
      comments[commentsKey] = match
      return commentsKey
    })
    //对包含中文的部分进行替换操作
    content = content.replace(/(['"`])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gm, value => {
      const { statement, hasReplace: hasReplaceItem } = this.getTransformValue(value)
      hasReplace = hasReplace || hasReplaceItem
      return statement
    })

    if (this.options.needReplace && hasReplace) {
      content = this.injectInstance(content)
    }
    //换回注释部分
    content = content.replace(/\/\*comment_\d+\*\//gim, (match: string) => {
      return comments[match] || match
    })

    return content
  }
  private generateImportModuleTestReg(moduleName: string) {
    return new RegExp(
    `import[\\s\\t]+([^\\s\\t]+)[^'"]+["']${moduleName}['"]|(const|let|var)[\\s\\t]+([^\\s\\t]+)[^'"]+['"]${moduleName}['"]`,
    'im'
  )
  }
  private injectInstance(content: string): string {
    if (this.options.vueVersion === 'vue2') {
      return this.injectInstanceFor2(content)
    }
    return this.injectInstanceFor3(content)
  }

  private injectInstanceFor2(content: string): string {
    let importContent = ''
    let injectContent = ''
    //判断是否注入vue
    let matchVue = content.match(this.generateImportModuleTestReg('vue'))
    let moduleVue = 'Vue'
    if (!matchVue) {
      importContent = `import Vue from 'vue';\n`
    } else {
      moduleVue = matchVue[1] || matchVue[3] || moduleVue
    }

    //若未绑定 $t ，则进行绑定
    if (content.indexOf('const $t = _i18n_vue.$t.bind(_i18n_vue)') < 0) {
      injectContent = `${injectContent}
      let _i18n_vue = new ${moduleVue}();
      const $t = _i18n_vue.$t.bind(_i18n_vue);`
    }
    content = `${importContent}${content}`
    content = this.injectAction(injectContent, content)
    return content
  }

  private injectInstanceFor3(content: string): string {
    if(this.isSetup) {
      return this.injectForHook(content, false)
    }
    // 检查是否有 setup 函数
    const matchSetup = content.match(setupReg)
    if(matchSetup) {
      return this.injectForHook(content, true)
    }
    return this.injectForScript(content)
  }
  public injectForHook(content: string, matchSetup: boolean): string {
    let importContent = ''
    let injectContent = ''
    const matchReg = /import\s+{.*useI18n.*}\s+from\s+(['"])vue-i18n\1/gs
    const matchI18n = content.match(matchReg)
    if (!matchI18n) {
      importContent = `\nimport { useI18n } from 'vue-i18n';`
    }
    content = `${importContent}${content}`
    if (content.indexOf('const { t: $t } = useI18n()') < 0) {
      injectContent = `const { t: $t } = useI18n()`
    }
    
    if (!matchSetup) {
      return this.injectAction(injectContent, content)
    }
    content = content.replace(setupReg, match => {
      return `${match}\n${injectContent}`
    })
    return content
    // const startIndex = matchSetup.index! + matchSetup[0].length
    // return this.injectForSetup(content, startIndex)
  }

  private injectForScript(content: string): string {
    const injectContent = 'const $t = window.global_i18n?.global?.t'
    if(content.indexOf(injectContent) < 0) {
      content = this.injectAction(injectContent, content)
    }
    return content;
  }

   private injectAction(injectContent:string, content: string,): string {
    //将引入模块的内容放到内容区的最前面
    let [lastImport] = (content.match(/import(?!from).+from(?!from).+;?/gm) || ['']).reverse()
    content = content.replace(lastImport!, match => {
      return `
      ${match}\n
      ${injectContent}
      `
    })
    return content
  }

  private injectForSetup(content: string, startIndex: number): string {
    let braceCount = 1
    let endIndex = content.length
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++ 
      } else if (content[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          endIndex = i + 1
          break
        }
      }
    }
    const beforeCode = content.substring(0, startIndex)
    const afterCode = content.substring(endIndex)
    let setupCode = content.substring(startIndex, endIndex)
    const returnReg = /return\s*\{\s*([^}]*)\}[^{}]*}$/
    setupCode = setupCode.replace(returnReg, (match, returnCode) => {
      const params = returnCode.split(',')
      if(params.includes('$t')) {
        return match
      }
      return match.replace(returnCode, `$t,\n${returnCode}`)
    })
    return `${beforeCode}${setupCode}${afterCode}`
  }
}