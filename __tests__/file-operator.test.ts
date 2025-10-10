import path from "path";
import { fileOperator } from "../core/fileOperator.ts"
import { getDefaultOptions } from "@/util.ts";

describe('getAllFiels', () => {
  test('should get target files in target file', () => {
    const targetFile = path.resolve(__dirname, '../core')
    const files = fileOperator.getAllFiles(targetFile, [path.resolve(__dirname, '../core/fileOperator.ts')])
    const output = ['base.ts', 'script-loader.ts', 'template-loader.ts'].map(name => {
      return path.resolve(__dirname, `../core/${name}`)
    })
    expect(files).toEqual(output)
  })
})

describe('getDefaultConfig', () => {
  test('should get default config', async () => {
    const config = await getDefaultOptions()
    expect(config).toEqual({
      needReplace: true,
      vueVersion: "vue3",
      loaderType: "vite",
      targetFiles: [path.resolve(process.cwd(), 'src')],
      outputDir: path.resolve(process.cwd(), 'src/locale'),
      excludeFiles: [],
      anchorName: "zh_cn",
      exportType: "ESM",
    })
  })
})