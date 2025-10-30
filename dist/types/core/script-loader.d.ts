import type { ILoaderOptions } from "../types/index.ts";
import { BaseUtils } from "./base.ts";
export declare class ScriptLoader extends BaseUtils {
    isSetup: boolean;
    tempCache: Record<string, string>;
    path: string;
    constructor(options: ILoaderOptions, path?: string);
    excute(content: string, isSetup?: boolean): string;
    private processNote;
    private extractChineseFromCode;
    private isInTypeDefinition;
    /**
     * 还原模板字符串的完整原始内容（包含插值表达式）
     * @param {object} templateLiteral
     * @returns {string}
    */
    private getTemplateRawContent;
    /**
     * 生成 $t 调用的 AST 节点（支持可选参数数组）
     * @param key 国际化 key（如 'asbldf'）
     * @param args 可选参数数组（如 [this.data, user.data.a] 的 AST 节点）
     * @returns CallExpression 节点（$t('key', [args...])）
     */
    private createTCallNode;
    private processCachedTypes;
    private getCachedKey;
    private processComment;
    private processWithNestType;
    private generateImportModuleTestReg;
    private injectInstance;
    private injectInstanceFor2;
    private injectInstanceFor3;
    injectForHook(content: string, matchSetup: boolean): string;
    private injectForScript;
    private injectAction;
}
//# sourceMappingURL=script-loader.d.ts.map