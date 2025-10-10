export interface PluginOption {
  name: string
  enforce: 'pre' | 'post',
  transform(source: string, id: string): Promise<{ code: string } | null>
}

export type IVueVersion = 'vue2' | 'vue3'
export interface ILoaderOptions {
  vueVersion: IVueVersion,
  loaderType: 'webpack' | 'vite',
  needReplace: boolean,
  targetFiles: string[] | string,
  excludeFiles?: string[],
  outputDir: string,
  anchorName?: string,
  translateList: {
    name: string,
    fileName: string,
  }[],
  exportType?: 'ESM' | 'CJS',
  whiteList?: string[],
}