export interface PluginOption {
  name: string
  enforce: 'pre' | 'post',
  transform(source: string, id: string): { code: string } | null
}