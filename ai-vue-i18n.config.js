const path = require('path')

module.exports = {
  vueVersion: 'vue3', // vue的版本，支持vue3/vue2
  loaderType: 'vite', // loader加载器类型。支持webpack/vite
  providerType: 'OPENAI',
  model: '',
  baseURL: 'http://localhost:11434',
  apiKey: '',
  temperature: 0.2,
  chunkSize: 20, // 每个请求翻译数量
  prompt: '',
  targetFiles: [path.resolve(process.cwd(), 'src')], // 需要翻译的文件
  excludeFiles: [], // 不需要翻译的文件
  outputDir: path.resolve(process.cwd(), 'src/locale'), // 翻译后的文件存放目录
  anchorName: 'zh_cn', // 中文语言包名称，系统默认生成此名称。如果修改了中文语言包名称，这里需要修改为新的名称
  // 翻译列表，指定需要翻译的语言类型和生成文件名称
  translateList: [
    {
      name: '英文',
      fileName: 'en'
    }
  ], 
  exportType: 'ESM', // 语言包内容的导出类型，支持ESM/CJS
  whiteList: [], // 白名单，白名单中的中文不会被翻译
}