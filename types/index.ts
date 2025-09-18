export interface PluginOption {
  name: string
  enforce: 'pre' | 'post',
  transform(source: string, id: string): { code: string } | null
}

export interface loaderOptions {
  vue2: boolean,
  vue3: boolean,
  vite: boolean,
  webpack: boolean,
}