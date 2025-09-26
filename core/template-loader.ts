import { BaseUtils, templateReg } from "./base.ts"
import * as parser from "@babel/parser"
import traverse from "@babel/traverse"
import generate from "@babel/generator"
import { type ILoaderOptions } from "../types/index.ts"

const tagAttrReg = /(<[^\/\s]+)([^<>]*(?:<[^>]+>[^<>]*)*)(\/?>)/gm
const attrValueReg = /([^\s]+)=(["'])(((?!\2).)*[\u4e00-\u9fa5]+((?!\2).)*)\2/gims

export class TemplateLoader extends BaseUtils {
  constructor(options: ILoaderOptions) {
    super(options)
  }
  excute(content: string) {
    content = this.processTagAttr(content)
    content = this.processTemplate(content)
    content = this.restore(content)
    return content
  }
  public clearNote(content: string):string {
    return content.replace(/<!--[\s\S]*?-->/g, '')
  }
  public processTagAttr(content: string):string {
    return content.replace(tagAttrReg, (_:string, tag:string, attr:string, endTag:string) => {
      attr = attr.replace(attrValueReg, (_attr:string, key:string, quote:string, value:string) => {
        const whiteList = ['style', 'class', 'src', 'href', 'width', 'height']
        if(whiteList.includes(key.trim())) {
          return _attr
        }
        value = value.trim()
        if(key.startsWith(':') || key.match(/^(v-|@)/)) {
          value = this.getTransformValue(value, quote)
          return `${key}=${quote}${value}${quote}`
        }
        if(
          !['true', 'false'].includes(value)
          && isNaN(Number(value))
        ) {
          value = quote === '"' ? `'${value}'` : `"${value}"`
          value = this.getTransformValue(value, quote)
          return `v-bind:${key}=${quote}${value}${quote}`
        }
        return _attr
      })
      return `${tag}${attr}${endTag}`
    })
  }
  public processTemplate(content: string):string {
    const replaceTemplateSyntax = (str: string) => {
      return str.replace(/\$\{([^}]+)\}/g, (_match, p1:string) => {
        return `" + ${p1} + "`
      })
    }
    
    return content.replace(templateReg, (_:string, tag:string, value:string, endTag:string) => {
      value = value.trim()
      // 先剔除模板字符串，方便后续修改上下文，不然会影响后续的匹配
      value = replaceTemplateSyntax(value).replace('`" +', '').replace('+ "`', '').replace('`', '"')
      
      value = value.replace(/\$\{([^\}]+)\}/gm, (_, value) => {
        return `\${${this.addContext(value)}}`
      })
      // 先以最少匹配模式匹配所有的{{}}，否则多个{{}}会被替换成一个
      value = value.trim().replace(/\{{([^}]+)(}})/gm, (_, value) => {
        return `\${${this.addContext(value)}}`
      })
      // 兼容有模板字符串的场景
      value = value.trim().replace(/\{{(.+)(}})/gm, (_, value) => {
        return `\${${this.addContext(value)}}`
      })
      //将所有不在 {{}} 内的内容，用 {{}} 包裹起来
      value = value.replace(/^((?!{{)[\s\S])+/gm, value => {
        //前面部分
        return `{{${JSON.stringify(value)}}}`
      })
      value = value.replace(/}}(((?!}})[\s\S])+)$/gm, (_, value) => {
        //后面部分
        return `}}{{${JSON.stringify(value)}}}`
      })
      //对所有的{{}}内的内容进行国际化替换
      value = value.replace(/({{)(((?!\1|}}).)+)(}})/gm, (_, prevSign, value, _$3, afterSign) => {
        if (value.indexOf('${') > -1) {
          value = value.replaceAll('"', '`')
          value = value.replaceAll('\\`', '"')
        }
        return `${prevSign}${this.getTransformValue(value, '"')}${afterSign}`
      })
      return `${tag}${value}${endTag}`
    })
  }
  public restore(content: string):string {
    this.cacheString.forEach((value, key) => {
      content = content.replace(key, value || '')
    })
    return content
  }
  private addContext(code: string):string {
    if(this.options.vueVersion !== 'vue2') {
      return code
    }
    const ast = parser.parse(code, {
      sourceType: 'module',
    })
    const traverseFunction = typeof traverse === 'function' ? traverse : traverse.default;
    (traverseFunction as any)(ast, {
      Identifier(path: any) {
        const parent = path.parent
        const parentType = parent.type
        if(path.node.name !== '__UNDEF' && (
          parentType === 'BinaryExpression' ||
          parentType === 'ExpressionStatement' ||
          (parentType === 'MemberExpression' && parent.object === path.node) ||
          (parentType === 'CallExpression' && (parent.callee === path.node || parent.arguments.includes(path.node))) ||
          (parentType === 'AssignmentExpression' && parent.left === path.node) ||
          (parentType === 'VariableDeclarator' && parent.init === path.node) ||
          (parentType === 'LogicalExpression' && (parent.left === path.node || parent.right === path.node)) ||
          (parentType === 'ConditionalExpression' &&( parent.test === path.node || parent.consequent === path.node || parent.alternate === path.node))
        )) {
          path.node.name = `(typeof ${path.node.name} === 'undefined' ? this.${path.node.name} : ${path.node.name})`
        }
      }
    })
    const generatedCode = (generate as any)(ast, {}, code).code
    return generatedCode.replace(/;$/, '')
  }
}
