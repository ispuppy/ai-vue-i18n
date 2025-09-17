import { templateLoader } from "../core/template-loader.ts";

const TagText = '<Test v-model="data" empty-text="暂无数据" :filter="filter" :value="`${data}测试`" :str="\'测试一下\'" @click="handlerClick(\'测试\', false)" />';
const TemplateText = `<div>测试1{{user.data}}测试2{{data}}{{\`\${data}测试\`}}测试3</div>`

describe("template-loader", () => {
  test("should process normal attribute", () => {
    const input = TagText
    const output = templateLoader.processTagAttr(input);
    expect(output).toBe(
      '<Test v-model="data" v-bind:empty-text="$t(\'21efd8\')" :filter="filter" :value="$t(\'a6801b\', [data])" :str="$t(\'9ed41a\')" @click="handlerClick($t(\'db06c7\'), false)" />'
    );
  });
});

describe("template-loader", () => {
  test("should process template", () => {
    const input = TemplateText
    const output = templateLoader.processTemplate(input);
    expect(output).toBe(
      '<div><trans v-html=\"$t(\'e039ea\', [(typeof user === \'__UNDEF\' ? this.user : user).data,(typeof data === \'__UNDEF\' ? this.data : data),(typeof data === \'__UNDEF\' ? this.data : data) + \'测试\'])\"></trans></div>'
    );
  });
});
