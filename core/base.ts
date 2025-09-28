import crypto from "crypto";
import type { ILoaderOptions } from "../types/index.ts";
import { fileOperator } from "./fileOperator.ts";

export const templateReg = /(>)\s*([^><]*[\u4e00-\u9fa5]+[^><]*)\s*(<)/gm;
export class BaseUtils {
  options: ILoaderOptions;
  cacheString: Map<string, string> = new Map();
  constructor(options: ILoaderOptions) {
    this.options = options;
  }
  public Md5_6(str: string) {
    return crypto.createHash("md5").update(str).digest("hex").substring(8, 14);
  }
  public getTransformValue(
    statement: string,
    externalQuote: string = '"'
  ): { statement: string; hasReplace: boolean } {
    const matchReg = /([`'"])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gms;
    let shouldBreakLoop = false;
    let hasReplace = false;
    const match = () => statement.match(matchReg) && !shouldBreakLoop;
    if (!match()) {
      return { statement, hasReplace };
    }
    const needReplace = this.options.needReplace;
    while (match()) {
      statement = statement.replace(
        matchReg,
        (match: string, quote: string, value: string) => {
          return this.processMatchedString(
            match,
            value,
            quote,
            externalQuote,
            needReplace,
            () => {
              shouldBreakLoop = true;
            },
            () => {
              hasReplace = true;
            }
          );
        }
      );
    }
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
    onBreak: () => void,
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

    // 处理需要替换但没有对应key的情况
    if (needReplace && !fileOperator.getMessage(md5Key)) {
      onBreak();
      return this.handleNoTranslationKey(originalMatch, key, processedValue);
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
    const md5Key = this.Md5_6(value);
    const internalQuote = externalQuote === '"' ? "'" : '"';
    const _quote = quote === "`" ? internalQuote : quote;
    const key = `${_quote}${md5Key}${_quote}`;

    return {key, md5Key};
  }

  /**
   * 处理没有翻译键的情况
   */
  private handleNoTranslationKey(
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
  }

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
}
