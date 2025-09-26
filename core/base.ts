import crypto from "crypto";
import type { ILoaderOptions } from "../types/index.ts";

export const templateReg = /(>)\s*([^><]*[\u4e00-\u9fa5]+[^><]*)\s*(<)/gm
export class BaseUtils {
  options: ILoaderOptions;
  cacheString: Map<string, string> = new Map();
  constructor(options: ILoaderOptions) {
    this.options = options;
  }
  public Md5_6(str: string) {
    return crypto.createHash("md5").update(str).digest("hex").substring(0, 6);
  }
  public getTransformValue(statement: string, externalQuote: string = '"'): string {
    const matchReg = /([`'"])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gms;
    const match = () => statement.match(matchReg);
    if (!match()) {
      return statement;
    }
    while (match()) {
      statement = statement.replace(
        matchReg,
        (match: string, quote: string, value: string) => {
          let matchIndex = 0;
          const expressionArr: string[] = [];
          const isTemplate = quote === "`";

          if (isTemplate) {
            value = value.replace(
              /\${([^}]+)}/gm,
              (_: string, expression: string) => {
                expressionArr.push(expression);
                return `{${matchIndex++}}`;
              }
            );
          }
          const md5Key = this.Md5_6(value);
          const internalQuote = externalQuote === '"' ? "'" : '"';
          const _quote = isTemplate ? internalQuote : quote;
          const key = `${_quote}${md5Key}${_quote}`;
          if(this.options.needReplace && templateReg.test(value)) {
            // 先把属性中的标签替换掉，防止后续被模板语法识别
            this.cacheString.set(`$t(${key})`, match);
            return `$t(${key})`
          }
          if (expressionArr.length) {
            return `$t(${key}, [${expressionArr.join(",")}])`;
          } else {
            return `$t(${key})`;
          }
        }
      );
    }
    return statement;
  }
  
}
