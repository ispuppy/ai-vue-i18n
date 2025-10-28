import { TemplateLoader } from "../core/template-loader.ts";
import { defaultOptions } from "@/util.ts";

const vue2TemplateLoader = new TemplateLoader({ ...defaultOptions, vueVersion: 'vue2', needReplace: false })
const vue3TemplateLoader = new TemplateLoader({ ...defaultOptions, vueVersion: 'vue3', needReplace: false })

describe("attr-loader-normal", () => {
  test("should process normal attribute", () => {
    const input = '<Test v-model="data" empty-text=\'暂无数据\' :filter="filter" :value="`${data}测试`" :str="\'测试一下\'" @click="handlerClick(\'测试\', false)" />'
    const output = vue2TemplateLoader.excute(input);        
    expect(output).toBe(
      '<Test v-model="data" v-bind:empty-text="$t(\'67a398\')" :filter="filter" :value="$t(\'bcc95a\', [data])" :str="$t(\'02f2b9\')" @click="handlerClick($t(\'1e24cf\'), false)" />'
    );
  });

  test("attr with expression", () => {
    const input = `<div
      class="mtm-click"
      :data-click-type="
        JSON.stringify({
          classify: 'common',
          action: 'date_range_picker',
          name: \`日期范围-\${value.join('-')}\`,
        })"
    >`
    const output = vue2TemplateLoader.excute(input); 
    expect(output).toBe(
      `<div
      class="mtm-click"
      :data-click-type="JSON.stringify({
          classify: 'common',
          action: 'date_range_picker',
          name: $t('c72deb', [value.join('-')]),
        })"
    >`
    );
  })

  test("attr width multi symbol", () => {
    const input = '<div content="这是一段文本测试`user`,测试模板符号`user`作为字符串"></div>'
    const output = vue2TemplateLoader.excute(input);        
    expect(output).toBe(
      '<div v-bind:content="$t(\'fc7c8e\')"></div>'
    );
  });

  test("attr width nestSymbol", () => {
    const input = '<div content="控制器中定义的权限字符，如：@PreAuthorize(`@ss.hasPermi(\'system:user:list\')`)"></div>'
    const output = vue2TemplateLoader.excute(input);        
    expect(output).toBe(
      '<div v-bind:content="$t(\'207cb4\')"></div>'
    );
  });
});

describe("attr-loader-insetTag", () => {
  test("should process normal attribute", () => {
    const input = `
    <el-tooltip
      :test="'测试123' + data"
      :content="
      \`测试一下
        <div>\${data}</div>
        测试一下<span>测试一下</span>\`"
    >
      <span class="test">测试一下</span>
    </el-tooltip>
    `
    const output = vue2TemplateLoader.excute(input);
    expect(output).toBe(`
    <el-tooltip
      :test=\"$t('287e04') + data\"
      :content=\"$t('f6b9c2', [data])\"
    >
      <span class=\"test\">{{$t("02f2b9")}}</span>
    </el-tooltip>
    `
    );
  });
});

describe("template-loader-vue2", () => {
  test("should process template", () => {
    const input = '<div>测试1{{user.data}}测试{{data}}{{`${data}测试`}}测试3</div>'
    const output = vue2TemplateLoader.excute(input);
    expect(output).toBe(
      "<div>{{$t('15c3d5', [(user == null ? this.user : user).data,(data == null ? this.data : data),(data == null ? this.data : data) + $t(\"1e24cf\")])}}</div>"
    );
  });
});

describe("template-loader-vue3", () => {
  test("should process template", () => {
    const input = '<div>测试1{{user.data}}测试{{data}}{{`${data}测试`}}测试3</div>'
    const output = vue3TemplateLoader.excute(input);
    expect(output).toBe(
      "<div>{{$t('15c3d5', [user.data,data, data + $t(\"1e24cf\")])}}</div>"
    );
  });
});
