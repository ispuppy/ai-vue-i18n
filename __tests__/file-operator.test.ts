import path from "path";
import { fileOperator } from "../core/fileOperator.ts"

describe('getAllFiels', () => {
  test('should get target files in target file', async () => {
    const config = await fileOperator.getConfig(true)
    config.targetFiles = [path.resolve(__dirname, '../src')]
    config.excludeFiles = [path.resolve(__dirname, '../src/ai-translate')]
    const files = fileOperator.getAllFiles(config)
    const output = ['generate.ts', 'loader-for-vite.ts', 'loader-for-webpack.ts', 'test.js', 'util.ts'].map(name => {
      return path.resolve(__dirname, `../src/${name}`)
    })
    expect(files).toEqual(output)
  })
})

describe('getDefaultConfig', () => {
  test('should get default config', async () => {
    const config = await fileOperator.getConfig()
    expect(config).toMatchObject({
      needReplace: true,
      vueVersion: "vue3",
      excludeFiles: [],
      anchorName: "zh_cn",
      exportType: "ESM",
    })
  })
})