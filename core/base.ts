import crypto from "crypto";

export class BaseUtils {
  public Md5_6(str: string) {
    return crypto.createHash("md5").update(str).digest("hex").substring(0, 6);
  }
  public getTransformValue(statement: string, externalQuote: string): string {
    const matchReg = /([`'"])(((?!\1).)*[\u4e00-\u9fa5]+((?!\1).)*)\1/gms;
    const match = () => statement.match(matchReg);
    if (!match()) {
      return statement;
    }
    while (match()) {
      statement = statement.replace(
        matchReg,
        (_: string, quote: string, value: string) => {
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
