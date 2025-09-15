import { processTemplate } from '../core/template-loader.ts'

describe('template-loader', () => {
  test('should process normal attribute', () => {
    const input = '<Test v-model="data" empty-text="暂无数据" :filter="filter" :value="`${data}测试`" :str="\'测试一下\'" @click="handlerClick(\'测试\')" />'
    const output = processTemplate(input)
    expect(output).toBe(' v-model="data" v-bind:empty-text="\'暂无数据\'" :filter="filter" :value="`${data}测试`" :str="\'测试一下\'" @click="handlerClick(\'测试\')" /')
  })
})
