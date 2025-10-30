import type { ILoaderOptions, IVueVersion } from '../types/index.ts';
export declare const defaultOptions: ILoaderOptions;
export declare const mergeOptions: (config: Partial<ILoaderOptions>) => ILoaderOptions;
export declare const getVueModule: (code: string, vueVersion: IVueVersion) => {
    template: string | undefined;
    script: string | undefined;
    scriptSetup: string | undefined;
};
export declare const validateFileType: (filePath: string, options: ILoaderOptions, isDirectory?: boolean) => boolean;
export declare const requestPool: (poolSize: number) => (request: () => Promise<any>) => Promise<unknown>;
//# sourceMappingURL=util.d.ts.map