import { BaseUtils } from "./base.ts"
import * as parser from "@babel/parser"
import traverse from "@babel/traverse"
import generate from "@babel/generator"
import { type ILoaderOptions } from "../types/index.ts"
import { parse }  from "vue-eslint-parser";
import MagicString from 'magic-string';
import type { ESLintProgram, VElement, VExpressionContainer, VText } from "vue-eslint-parser/ast/index"

const tagAttrReg = /(<[^\/\s>]+)(([^'">`]+=(?:"[^"]*"|'[^']*'|`[^`]*`)*?[^'">`]*?)+)(\/?>)/gm
const attrValueReg = /([^\s]+)=(["'])(((?!\2).)*[\u4e00-\u9fa5]+((?!\2).)*)\2/gims

type INode = VElement | VText | VExpressionContainer | ESLintProgram['templateBody']
export class TemplateLoader extends BaseUtils {
  path:string = ''
  constructor(options: ILoaderOptions, path: string = '') {
    super(options)
    this.path = path
  }
  
  excute(template: string) {
    template = this.processTagAttr(template)
    const processTemplateTag = this.getProcessTemplateTag()
    template = processTemplateTag(true, template)
    const ast: ESLintProgram = parse(template, {
      sourceType: 'module',
      ecmaVersion: 2020,
      vueFeatures: { version: this.options.vueVersion === 'vue3' ? 3 : 2 }
    });
    const processedNodes = new Set<number>();
    const magicString = new MagicString(template)
    this.processElement(ast.templateBody, processedNodes, magicString)
    const result = magicString.toString()
    return processTemplateTag(false, result)
  }

  private getProcessTemplateTag() {
    let hasAdd = false
    return (add: boolean, content: string) => {
      const hasTemplateTag = /^\s*<template\b[^>]*>[\s\S]*?<\/template>\s*$/.test(content)
      if (add) {
        if(!hasTemplateTag) {
          content = `<template>${content}</template>`
          hasAdd = true
        }
        return content
      }
      if(!hasAdd) {
        return content
      }
      return content.replace(/^\s*<template>(.*)<\/template>\s*$/gs, (_, value:string) => {
        return value
      })
    }
  }
  private processElement(node: INode, processedNodes: Set<number>, magicString: MagicString) {
    try {
        // 跳过无效节点或已处理节点
      if (!node || processedNodes.has(node.range[0]) || node.type !== 'VElement') {
        return;
      }
      let beginFlag = true
      let contentParts: string[] = []
      let contentNodes: (VText | VExpressionContainer)[] = []; // 存储文本/插值的节点对象（用于定位替换范围）
      node.children.forEach((child, index) => {
        if (child.type === 'VText') {
          contentParts.push(child.value);
          contentNodes.push(child); 
        } else if (child.type === 'VExpressionContainer' && child.expression) {
          const expression = magicString.slice(child.range[0], child.range[1])
          contentParts.push(expression);
          contentNodes.push(child);
        } else {
          beginFlag = false
        }
        // 对同一个文本节点执行替换
        if(!beginFlag || index === node.children.length - 1) {
          const fullContent = contentParts.join(''); // 拼接文本+插值为完整内容
          if(fullContent && /[\u4e00-\u9fa5]/.test(fullContent)) {
            const result = this.processTemplate(fullContent)
            const start = contentNodes[0]!.range[0]; 
            const end = contentNodes[contentNodes.length - 1]!.range[1];
            magicString.overwrite(start, end, result);
          }
          contentParts = []
          contentNodes = []
          beginFlag = true
        }
      });
      processedNodes.add(node.range[0]);
      node.children.forEach(child => this.processElement(child, processedNodes, magicString));
    } catch (error: any) {
      console.error(`template模块解析失败：${this.path}\n原因：${error.message}`)
    }
  }

  private clearNote(content: string):string {
    return content.replace(/<!--[\s\S]*?-->/g, '')
  }

  private processTagAttr(content: string):string {
    return content.replace(tagAttrReg, (_:string, tag:string, attr:string, _$, endTag:string) => {
      attr = attr.replace(attrValueReg, (_attr:string, key:string, quote:string, value:string) => {
        const whiteList = ['style', 'class', 'src', 'href', 'width', 'height']
        if(whiteList.includes(key.trim())) {
          return _attr
        }
        value = value.trim()
        if(key.startsWith(':') || key.match(/^(v-|@)/)) {
          const { statement } = this.getTransformValue(value, quote)
          value = statement
          return `${key}=${quote}${value}${quote}`
        }
        if(
          !['true', 'false'].includes(value)
          && isNaN(Number(value))
        ) {
          value = `'${value}'`
          const { statement, hasReplace } = this.getTransformValue(value, '"', false)
          if(!hasReplace) {
            return _attr
          }
          value = statement
          return `v-bind:${key}="${value}"`
        }
        return _attr
      })
      return `${tag}${attr}${endTag}`
    })
  }

  private processTemplate(value: string):string {
    const replaceTemplateSyntax = (str: string) => {
      return str.replace(/\$\{([^}]+)\}/g, (_match, p1:string) => {
        return `" + ${p1} + "`
      })
    }
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
    return value.replace(/({{)(((?!\1|}}).)+)(}})/gm, (_, prevSign, value, _$3, afterSign) => {
      let hasExpression = false
      if (value.indexOf('${') > -1) {
        value = value.replaceAll('"', '`')
        value = value.replaceAll('\\`', '"')
        hasExpression = true
      }
      const { statement } = this.getTransformValue(value, '"', hasExpression)
      return `${prevSign}${statement}${afterSign}`
    })
  }

  private restore(content: string):string {
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
          path.node.name = `(${path.node.name} == null ? this.${path.node.name} : ${path.node.name})`
        }
      }
    })
    const generatedCode = (generate as any)(ast, {}, code).code
    return generatedCode.replace(/;$/, '')
  }
}
