export interface PluginOption {
  name: string
  enforce: 'pre' | 'post',
  transform(source: string, id: string): { code: string } | null
}
export interface ILoaderOptions {
  vueVersion: 'vue2' | 'vue3',
  loaderType: 'webpack' | 'vite',
}