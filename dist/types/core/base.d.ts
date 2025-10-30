import type { ILoaderOptions } from "../types/index.ts";
export declare class BaseUtils {
    options: ILoaderOptions;
    cacheString: Map<string, string>;
    getMd5Key: (str: string) => string;
    constructor(options: ILoaderOptions);
    Md5_6(str: string): string;
    Md5_16(str: string): string;
    getTransformValue(statement: string, externalQuote?: string, isExpression?: boolean): {
        statement: string;
        hasReplace: boolean;
    };
    /**
     * 处理普通字符串，不包含表达式
     */
    private getNormalTransformValue;
    /**
     * 处理匹配到的字符串，生成对应的翻译函数调用
     */
    private processMatchedString;
    /**
     * 处理模板字符串中的表达式
     */
    private processTemplateExpressions;
    /**
     * 生成翻译键
     */
    private generateTranslationKey;
    /**
     * 处理没有翻译键的情况
     */
    /**
     * 生成翻译函数调用
     */
    private generateTranslationCall;
    /**
     * 获取嵌套符号内的内容
     * @param content 原始内容
     * @param symbol 嵌套符号，例如 '{' 和 '}'
     * @param startIndex 开始索引
     * @returns 嵌套符号内的内容
     */
    getNestSymbolValue(content: string, symbols: string[] | undefined, startIndex: number): string;
}
//# sourceMappingURL=base.d.ts.map