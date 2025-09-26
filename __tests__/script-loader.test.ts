import { ScriptLoader } from "../core/script-loader.ts";
const commonOptions = {
  needReplace: false,
}
const vue2ScriptLoader = new ScriptLoader({ vueVersion: 'vue2', loaderType: 'vite', ...commonOptions })
const vue3ScriptLoader = new ScriptLoader({ vueVersion: 'vue3', loaderType: 'vite', ...commonOptions })

describe('ScriptLoader', () => {
  test("should process normal attribute", () => {
    const input = `
import { defineComponent, ref, toRefs } from 'vue'
export default defineComponent({
  setup(props) {
    const testFn = () => {
      const testFn2 = () => {
        return '测试'
      }
      return {
        test: testFn2()
      }
    }
    const test2 = ref(testFn().test)
    return {
      test2
    }
  }
})
    `
    const output = vue3ScriptLoader.excute(input);        
    expect(output).toBe(`
import { useI18n } from 'vue-i18n';
import { defineComponent, ref, toRefs } from 'vue'
export default defineComponent({
  setup(props) {
const { t: $t } = useI18n()
    const testFn = () => {
      const testFn2 = () => {
        return $t('db06c7')
      }
      return {
        test: testFn2()
      }
    }
    const test2 = ref(testFn().test)
    return {
      test2
    }
  }
})
    `
    );
  });
})
