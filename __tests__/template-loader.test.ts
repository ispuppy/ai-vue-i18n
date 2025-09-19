import { templateLoader } from "../core/template-loader.ts";

describe("template-loader", () => {
  test("should process normal attribute", () => {
    const input = '<Test v-model="data" empty-text="暂无数据" :filter="filter" :value="`${data}测试`" :str="\'测试一下\'" @click="handlerClick(\'测试\', false)" />'
    const output = templateLoader.processTagAttr(input);
    expect(output).toBe(
      '<Test v-model="data" v-bind:empty-text="$t(\'21efd8\')" :filter="filter" :value="$t(\'504933\', [data])" :str="$t(\'9ed41a\')" @click="handlerClick($t(\'db06c7\'), false)" />'
    );
  });
});

describe("template-loader", () => {
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
    const output = templateLoader.processTagAttr(input);
    expect(output).toBe(`
    <el-tooltip
      :test=\"$t('4a65a5') + data\"
      :content=\"$t('45f845', [data])\"
    >
      <span class=\"test\">测试一下</span>
    </el-tooltip>
    `
    );
  });
});

describe("template-loader", () => {
  test("should process template", () => {
    const input = '<div>测试1{{user.data}}测试{{data}}{{`${data}测试`}}测试3</div>'
    const output = templateLoader.excute(input, { vueVersion: 'vue2', loaderType: 'vite' });
    expect(output).toBe(
      "<div>{{$t('12951e', [(typeof user === 'undefined' ? this.user : user).data,(typeof data === 'undefined' ? this.data : data),(typeof data === 'undefined' ? this.data : data) + $t(\"db06c7\")])}}</div>"
    );
  });
});

describe("template-loader", () => {
  test("should process template", () => {
    const input = '<div>测试1{{user.data}}测试{{data}}{{`${data}测试`}}测试3</div>'
    const output = templateLoader.excute(input, { vueVersion: 'vue3', loaderType: 'vite' });
    expect(output).toBe(
      "<div>{{$t('12951e', [user.data,data, data + $t(\"db06c7\")])}}</div>"
    );
  });
});
