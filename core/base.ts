import crypto from "crypto";
import type { ILoaderOptions } from "../types/index.ts";
import { fileOperator } from "./fileOperator.ts";

const nestSymbolMap: Record<string, string> = {
  '{': '}',
  '(': ')',
  '[': ']',
  '<': '>',
}
// export const templateReg = /(>)\s*([^><]*[\u4e00-\u9fa5]+[^><]*)\s*(<)/gm;
// export const templateReg = /<\/?[^\/\s>]+[^>]*>((?:(?!<\/?[^\/\s>]+[^>]*>)[\s\S])*(?:[\u4e00-\u9fa5])(?:(?!<\/?[^\/\s>]+[^>]*>)[\s\S])*)<\/?[^\/\s>]+[^>]*>/gm;


export class BaseUtils {
  options: ILoaderOptions;
  cacheString: Map<string, string> = new Map();
  getMd5Key: (str: string) => string = (str: string) => this.Md5_6(str);
  constructor(options: ILoaderOptions) {
    this.options = options;
    this.getMd5Key = options.md5Key ===  'md5_16' ? this.Md5_16 : this.Md5_6
  }
  public Md5_6(str: string) {
    return crypto.createHash("md5").update(str).digest("hex").substring(8, 14);
  }

  public Md5_16(str: string) {
    return crypto.createHash("md5").update(str).digest("hex").substring(8, 24);
  }
  public getTransformValue(
    statement: string,
    externalQuote: string = '"',
    isExpression: boolean = true
  ): { statement: string; hasReplace: boolean } {
    
    if(!isExpression) {
      return this.getNormalTransformValue(statement, externalQuote);
    }
    const templateMatchReg = [/([`])(((?!\1).)*)\1/gms, /([`])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gms];
    const normalMatchReg = [/(['"])(((?!\1).)*)\1/gms, /(['"])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gms];
    
    let hasReplace = false;
    const needReplace = this.options.needReplace;
    for(const matchReg of [templateMatchReg, normalMatchReg]) {
      const [preMatchReg, contentMatchReg] = matchReg as [RegExp, RegExp];
      statement = statement.replace(preMatchReg, (preMatch: string) => {
        return preMatch.replace(
          contentMatchReg,
          (match: string, quote: string, value: string) => {
            return this.processMatchedString(
              match,
              value,
              quote,
              externalQuote,
              needReplace,
              () => {
                hasReplace = true;
              }
            );
          }
        );
      })
    }
    return { statement, hasReplace };
  }

  /**
   * 处理普通字符串，不包含表达式
   */
  private getNormalTransformValue(
    statement: string,
    externalQuote: string = '"'
  ): { statement: string; hasReplace: boolean } {
    let hasReplace = false
    const needReplace = this.options.needReplace;
    statement = statement.replace(/(['"])((.)*)\1/gms, (match: string, quote: string, value: string) => {
      return this.processMatchedString(
        match,
        value,
        quote,
        externalQuote,
        needReplace,
        () => {
          hasReplace = true;
        }
      );
    })
    return { statement, hasReplace };
  }
  /**
   * 处理匹配到的字符串，生成对应的翻译函数调用
   */
  private processMatchedString(
    originalMatch: string,
    value: string,
    quote: string,
    externalQuote: string,
    needReplace: boolean,
    onReplace: () => void
  ): string {
    const { processedValue, expressions } = this.processTemplateExpressions(
      value,
      quote
    );
    const {key, md5Key} = this.generateTranslationKey(
      processedValue,
      quote,
      externalQuote
    );
    // 处理需要替换但没有对应key的情况或者在白名单内的情况
    if ((needReplace && !fileOperator.getMessage(md5Key)) || this.options.whiteList?.includes(processedValue)) {
      // return this.handleNoTranslationKey(originalMatch, key, processedValue);
      return originalMatch;
    }
    onReplace();
    
    // 写入文件（如果需要）
    !needReplace && fileOperator.setMessage(md5Key, processedValue);

    // 生成最终的翻译函数调用
    return this.generateTranslationCall(key, expressions);
  }

  /**
   * 处理模板字符串中的表达式
   */
  private processTemplateExpressions(
    value: string,
    quote: string
  ): { processedValue: string; expressions: string[] } {
    const expressions: string[] = [];
    let processedValue = value;

    if (quote === "`") {
      let matchIndex = 0;
      processedValue = value.replace(
        /\${([^}]+)}/gm,
        (_: string, expression: string) => {
          expressions.push(expression);
          return `{${matchIndex++}}`;
        }
      );
    }

    return { processedValue, expressions };
  }

  /**
   * 生成翻译键
   */
  private generateTranslationKey(
    value: string,
    quote: string,
    externalQuote: string
  ): {key: string, md5Key: string} {
    const md5Key = this.getMd5Key(value);
    const internalQuote = externalQuote === '"' ? "'" : '"';
    const _quote = quote === "`" ? internalQuote : quote;
    const key = `${_quote}${md5Key}${_quote}`;

    return {key, md5Key};
  }

  /**
   * 处理没有翻译键的情况
   */
  /* private handleNoTranslationKey(
    originalMatch: string,
    key: string,
    value: string
  ): string {
    if (templateReg.test(value)) {
      // 先把属性中的标签替换掉，防止后续被模板语法识别
      this.cacheString.set(`$t(${key})`, originalMatch);
      return `$t(${key})`;
    }
    return originalMatch;
  } */

  /**
   * 生成翻译函数调用
   */
  private generateTranslationCall(key: string, expressions: string[]): string {
    if (expressions.length) {
      return `$t(${key}, [${expressions.join(",")}])`;
    } else {
      return `$t(${key})`;
    }
  }
  
  /**
   * 获取嵌套符号内的内容
   * @param content 原始内容
   * @param symbol 嵌套符号，例如 '{' 和 '}'
   * @param startIndex 开始索引
   * @returns 嵌套符号内的内容
   */
  public getNestSymbolValue(content: string, symbols: string[] = [], startIndex: number) {
    const { matchConent } = symbols.reduce((prev, symbol) => {
      const { startIndex, matchConent } = prev
      if (!nestSymbolMap[symbol]) {
        return { startIndex, matchConent}
      }
      let braceCount = 0
      let endIndex = content.length
      let preText = ''
      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === symbol) {
          braceCount++ 
        } else if (content[i] === nestSymbolMap[symbol] ) {
          if(content[i] === '>' && preText === '=') {
            preText = '>'
            continue
          }
          braceCount--
          if (braceCount === 0) {
            endIndex = i + 1
            break
          }
        }
        preText = content[i]!
      }
      if (braceCount !== 0) {
        return { startIndex, matchConent}
      }
      const code = content.substring(startIndex, endIndex)
      return { startIndex: endIndex, matchConent: matchConent + code }
    }, { startIndex, matchConent: '' })
    return matchConent
  }
}
