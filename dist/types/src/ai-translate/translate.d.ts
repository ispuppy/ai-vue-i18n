import type { ILoaderOptions } from "@types";
export interface IGetKeyLanguageMapResult {
    keyLanguageMap: Record<string, string[]>;
    useCache: boolean;
}
export declare function getkeyLanguageMap(options: ILoaderOptions, check: true): Promise<IGetKeyLanguageMapResult | null>;
export declare function getkeyLanguageMap(options: ILoaderOptions, check?: false): Promise<IGetKeyLanguageMapResult>;
export declare const executeTranslate: (options: ILoaderOptions) => Promise<void>;
//# sourceMappingURL=translate.d.ts.map