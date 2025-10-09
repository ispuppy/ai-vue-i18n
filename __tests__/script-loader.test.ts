import { ScriptLoader } from "../core/script-loader.ts";
import { fileOperator } from "../core/fileOperator.ts"
const commonOptions = {
  needReplace: true,
}
fileOperator.setMessage('1e24cf', '测试')
const vue2ScriptLoader = new ScriptLoader({ vueVersion: 'vue2', loaderType: 'vite', ...commonOptions })
const vue3ScriptLoaderReplace = new ScriptLoader({ vueVersion: 'vue3', loaderType: 'vite', needReplace: true })
const vue3ScriptLoaderTranslate = new ScriptLoader({ vueVersion: 'vue3', loaderType: 'vite', needReplace: false })

describe('ScriptLoaderForSetup', () => {
  test("should process normal vue3 script", () => {
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
    const output = vue3ScriptLoaderReplace.excute(input, false);        
    expect(output).toBe(`
import { useI18n } from 'vue-i18n';
import { defineComponent, ref, toRefs } from 'vue'
export default defineComponent({
  setup(props) {
const { t: $t } = useI18n()
    const testFn = () => {
      const testFn2 = () => {
        return $t('1e24cf')
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

describe('ScriptLoaderForTs', () => {
  test("should process orignal script", () => {
    const input = `
const props = withDefaults(
  defineProps<
    Partial<DatePickerProps> & {
      range?: boolean;
      modelValue?: DatePickerProps["modelValue"];
      value?: DatePickerProps["modelValue"];
      weekStart?: number;
      test: () => void
    }
  >(),
  {
    type: 'date',
    startPlaceholder: "开始时间",
    endPlaceholder: "结束时间",
    rangeSeparator: "至",
    unlinkPanels: true,
    prefixIcon: Canlendar as any,
    clearIcon: IconClose as any,
    clearable: true,
    weekStart: 1,
  }
);`
    const output = vue3ScriptLoaderTranslate.excute(input, false);        
    expect(output).toBe(`
const props = withDefaults(
  defineProps<
    Partial<DatePickerProps> & {
      range?: boolean;
      modelValue?: DatePickerProps["modelValue"];
      value?: DatePickerProps["modelValue"];
      weekStart?: number;
      test: () => void
    }
  >(),
  {
    type: 'date',
    startPlaceholder: "开始时间",
    endPlaceholder: "结束时间",
    rangeSeparator: "至",
    unlinkPanels: true,
    prefixIcon: Canlendar as any,
    clearIcon: IconClose as any,
    clearable: true,
    weekStart: 1,
  }
);`)
  })
})
