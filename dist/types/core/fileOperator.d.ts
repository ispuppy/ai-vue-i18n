import type { ILoaderOptions, ITranslationLog } from "../types/index.ts";
export type MessageType = Record<string, string> | null;
export type ILanguageFiles = Record<string, {
    messages: MessageType;
    update: boolean;
    exportType: ILoaderOptions["exportType"];
}>;
declare class FileOperator {
    messages: MessageType;
    languageFiles: ILanguageFiles;
    config: ILoaderOptions | null;
    translationLog: ITranslationLog | null;
    private getFileUrl;
    private getExportStatement;
    getFileContent(filePath: string): Promise<{
        exportType: ILoaderOptions["exportType"];
        content: any;
    } | null>;
    getConfig(getNew?: boolean): Promise<ILoaderOptions>;
    initMessage(path: string, clear?: boolean): Promise<void>;
    getMessage(key: string): string | undefined;
    setMessage(key: string, value: string): void;
    getAllFiles(config: ILoaderOptions): string[];
    writeMessages(outputDir: string, localeFile: string, exportType?: string, messages?: MessageType): Promise<void>;
    updateTranslateMessages(key: string, id: string, text: string): void;
    setTotalTranslateMessages(languageFiles: ILanguageFiles, clearInexistence?: boolean): void;
    saveLanguageFiles(outputDir: string, exportType?: string): void;
    loadTranslationCache(outputDir: string): ITranslationLog;
    updateTranslationCache(key: string, lang: string, text: string): void;
    saveTranslationCache(outputDir: string): void;
}
export declare const fileOperator: FileOperator;
export {};
//# sourceMappingURL=fileOperator.d.ts.map