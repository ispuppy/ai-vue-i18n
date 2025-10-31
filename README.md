# AI-Vue-I18n - 智能多语言自动化解决方案

随着业务全球化发展，多语言支持已成为Vue项目开发的标配需求。然而传统多语言方案存在以下核心痛点：

1. **维护成本高**：每次文案调整需人工同步所有语言版本，极易遗漏
2. **开发效率低**：需在代码中手动插入大量`$t()`模板语法
3. **翻译质量不稳定**：人工翻译难以保持术语一致性，上下文缺失导致歧义
4. **改造成本高**：已有项目接入多语言需大规模代码重构

## 解决方案

&emsp;&emsp;ai-vue-i18n 提供全自动化多语言支持：

- 自动提取源码中的中文文本
- 调用AI接口批量翻译
- 生成标准i18n语言包
- 提供loader用以自动转换vue模板中的文本

&emsp;&emsp;开发人员只需要在项目中写中文，插件会自动提取出来，调用AI接口翻译，生成对应的语言包文件。

## 优势

- 支持多种AI模型：OpenAI、Deepseek、Ollama、LMStudio
- 自动提取项目中缺失翻译的中文进行翻译
- 批量翻译，提高效率
- 支持vue 2/vue 3项目，vite/webpack打包
- 支持 typescript 项目
- 提供pre-push hook，管控代码推送，确保所有中文都已翻译

## 一、原理简介

&emsp;&emsp;以下是vue2源码示例代码<br>

```js
<template>
  <div>
    <Child props="参数" />
    <div>测试</div>
    <div>{{ data }}</div>
  </div>
</template>   
<script>
export default {
   name: 'HelloWorld',
   components: {
      Child,
   },
   data() {
      return {
         data: '文本'
      }
   },
}
</script>

```

&emsp;&emsp;插件会将文件里的中文文本自动提取出来，如‘参数’、‘文本’等，再将中文生成对应的 md5 作为key，然后调取ai获取翻译值，生成对应的翻译文件如：

```js
// zh-cn.js
{
  "asf45e": "参数",
  "1e24cf": "测试",
  "sa34dd": "文本"
}
// en.js
{
  "asf45e": "Parameter",
  "1e24cf": "Test",
  "sa34dd": "Text"
}
```

&emsp;&emsp;同时提供loader，用于自动转换vue模板/js文件中的文本, 对script/js模块注入`$t`函数。转化后的代码示例如下。

```js
<template>
  <div>
    <Child :props="$t('asf45e')" />
    <div>{{ $t("1e24cf")}}</div>
    <div>{{ data }}</div>
  </div>
</template>   
<script>
import Vue from 'vue'
const _i18n_vue = new Vue();
const $t = _i18n_vue.$t.bind({$i18n: window.global_i18n})
export default {
   name: 'HelloWorld',
   components: {
      Child,
   },
   data() {
      return {
         data: $t('sa34dsd')
      }
   },
}
</script>
```

&emsp;&emsp;js 文件同理，也要替换中文并注入`$t`函数。

## 二、使用教程

### 1. 安装

```bash
npm install ai-vue-i18n -D
## vue2
npm install vue-i18n@8
## vue3
npm install vue-i18n@9
```

**版本推荐**：

- Node >= 16.0.0
- vue2 项目推荐 vue-i18n 8.x ，使用webpack打包
- vue3 项目推荐 vue-i18n 9.x ，使用vite打包

### 2. 初始化配置

```bash
npx i18n-config

```

&emsp;&emsp;完整配置参考[这里](#五完整配置参数) <br>
&emsp;&emsp;执行命令`npx i18n-config`生成一个`ai-vue-i18n.config.js`配置文件，我列举了部分字段如下：

```js
const path = require('path')

module.exports = {
  vueVersion: 'vue3', // vue的版本，支持vue3/vue2
  providerType: 'OPENAI',
  model: '',
  baseURL: 'http://localhost:11434',
  apiKey: '',
  temperature: 0.2,
  targetFiles: [path.resolve(process.cwd(), 'src')], // 需要翻译的文件
  excludeFiles: [], // 不需要翻译的文件
  outputDir: path.resolve(process.cwd(), 'src/locale'), // 翻译后的文件存放目录
  translateList: [
    {
      name: '英文',
      fileName: 'en'
    }
  ], 
}
```

&emsp;&emsp;这个文件默认是CJS格式的，需要根据项目实际情况进行调整为ESM格式。<br>
&emsp;&emsp;配置好vue的版本，ai服务商、模型、baseURL、apiKey, 以及翻译列表等核心字段后就可以执行翻译命令了。

### 3. 执行翻译

```bash
npx i18n-translate
```

&emsp;&emsp;过程大概如下

```bash
中文语言包生成完毕 ➤ ...\src\locale\zh_cn.js 
本次翻译分2组进行请求，共5个翻译项
进度 50.00%
进度 100.00%
成功翻译 2 组
翻译文件已保存到 ...\src\locale
```

&emsp;&emsp;翻译完成后，会在`outputDir`目录下生成对应的语言包文件，如`zh_cn.js`、`en.js`等。同时还有一个日志文件`translation.json`。

### 4. 创建i18n实例并集成到项目

#### 4.1 创建i18n实例

&emsp;&emsp;新建一个i18n.js文件，vue2代码示例如下：

```js
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from './en'
import zh from './zh_cn'

const messages = {
  en,
  zh
}
Vue.use(VueI18n)
const i18n = new VueI18n({
  locale: 'zh', // 设置默认语言
  messages // 绑定语言包
})
window.global_i18n = i18n // 必须将i18n实例挂载到window上的global_i18n属性上，后续要注入到js文件的
export default i18n
```

&emsp;&emsp;如果语言包非常大的话，也可以考虑使用动态加载语言包的方式，导出一个Promise。我这里用vue3举例：

```js
import { createI18n } from 'vue-i18n'

const LANGUAGES_LOADER = {
  en: () => [import('./en.js')],
  'zh-cn': () => [import('./zh_cn.js')],
}

const language = 'zh-cn' // 默认语言，切换语言时动态修改这个值就好了
const i18nLangLoader = new Promise((resolve, reject) => {
  Promise.all(LANGUAGES_LOADER[language]()).then((modules) => {
    const i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale: language,
      messages: {
        [language]: modules[0].default,
      }
    })
    window.global_i18n = i18n
    resolve(i18n)
  }).catch((err) => {
    reject(err)
  })
})

export default i18nLangLoader
```
>
> **注意：创建实例后要执行`window.global_i18n = i18n`将实例挂在到window上的global_i18n属性上，后续要注入到script/js文件中**
>
#### 4.2 集成到main.js

&emsp;&emsp;然后将vue-i18n实例集成到main.js中

```js
// vue2
import i18n from './locale/i18n' // 一定要先导入i18n实例，让vue-i18n实例先创建并挂在到window上，后续js文件的$t函数才能正常使用
import Vue from "vue";
import App from "./App.vue";

new Vue({
  i18n,
  render: (h) => h(App),
}).$mount("#app");
```

&emsp;&emsp;如果语言包是**同步导入**的话，只需要像上面一样把i18n实例文件**放在最上面导入**就可以了。这样后续的js文件中就可以使用`$t`函数了。<br>
&emsp;&emsp;如果是**异步导入**的话，就需要**将js文件的导入及vue模块的导入放在i18n实例创建之后**。只有这样，当项目读取js文件时，才能从window上取到i18n实例。

```js
// vue3
import { createApp } from 'vue'
import i18nLangLoader from './locale/i18n.ts'


i18nLangLoader.then((i18n) => {
  import('./App.vue').then(async (App) => {
    const app = createApp(App.default)
    const router = await import('./router')
    app.use(i18n)
    app.use(router.default)
    app.mount('#app')
  })
})
```

### 5. 引入Loader执行代码转换

#### 5.1 Vite配置

```javascript
// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { AIvueI18nPluginForVite } from "ai-vue-i18n";

export default defineConfig({
  plugins: [vue(), AIvueI18nPluginForVite()]
})
```

#### 5.2 Webpack配置

```javascript
// vue.config.js
module.exports = {
  chainWebpack: (config) => {
    config.module
      .rule('vue-i18n')
      .test(/\.(vue|js)$/)
      .enforce('pre')  // 确保在其他loader之前执行
      .use('ai-vue-i18n')
      .loader('ai-vue-i18n')
      .end()
  }
}
```

## 四、命令说明

| 命令 | 作用 |
|------|------|
| i18n-translate | 执行翻译 |
| i18n-config | 生成配置 |
| i18n-check | 检查当前项目是否有未翻译的中文 |
| i18n-add-pre-push | 添加git pre-push 钩子。如果执行该命令的话，在每次push代码前会先检查是否有未翻译的中文，有的话将会阻止push代码。如果项目中使用了husky的话，就不需要执行这个命令。在 |

> 注意：如果项目中使用了husky的话，就不需要执行`npx i18n-add-pre-push`命令。在package.json中配置husky的pre-push钩子即可。

```json
"husky": {
    "hooks": {
      "pre-push": "i18n-check"
    }
  }
```

## 五、完整配置参数

| 参数 | 必填 | 类型 | 可填值/默认值 | 详细说明 |
|------|------|------|------|------|
| vueVersion | 是 | string | 'vue2' 或 'vue3' | 指定Vue版本，影响模板解析和i18n集成方式 |
| providerType | 是 | string |'OPENAI'、'DEEPSEEK'、<br>'OLLAMA'、'LMSTUDIO' | AI服务提供商，主要还是看接口规范，如果是openai的接口范式（比如deepseek）填openai也可以 |
| apiKey | 是 | string | 自定义 | AI服务的API密钥，类型是'OLLAMA'、'LMSTUDIO'的话可以不填 |
| model | 否 | string | 自定义 | 指定AI模型名称，如'gpt-4' |
| baseURL | 否 | string | 自定义 | AI服务的地址 |
| temperature | 否 | number | 0-1 | 控制翻译创造性(0-1)，值越高结果越随机 |
| systemPrompt | 否 | string | 自定义 | 系统级提示词，用于指导AI翻译风格或者行业等。不允许涉及交互格式 |
| md5Key | 否 | string | 'md5_6'、'md5_16' | MD5 key格式，如'md5_6'会生成6位的key。一般6位就够用了，很难出现重复，实在不放心的话就填md5_16 |
| targetFiles | 是 | string[] | 自定义 | 需要翻译的文件目录，最好使用绝对路径 |
| excludeFiles | 否 | string[] | 自定义 | 排除的文件/目录，最好使用绝对路径 |
| outputDir | 是 | string | 自定义 | 语言文件输出目录，建议放在src目录下以便打包，最好使用绝对路径 |
| anchorName | 否 | string | 'zh_cn' | 中文语言包文件名(不含扩展名)，修改后需同步修改导入语句 |
| clearInexistence | 否 | boolean | false | 是否清除语言包中不存在于源码的key |
| translateList | 是 | Array<{name: string, fileName: string}> | 默认英文 | 需要翻译的语言列表，格式：[{name:'英文',fileName:'en'}] |
| chunkSize | 否 | number | 20 | 每批发送给AI的翻译文本数量。<br>如果量多的话，可以先填100. 然后如果有错误的话，再减少这个值。 |
| parallerSize | 否 | number | 10 | 并发请求数，根据API限制调整 |
| exportType | 否 | string | 'ESM' | 语言包导出格式，支持'ESM'(import/export)或'CJS'(require/module.exports) |
| whiteList | 否 | string[] | [] | 白名单中文文本，这些文本不会被翻译 |

## 六、常见问题

1. **返回的数据格式不符合要求**
   - AI返回的数据格式不对，大概率是是因为chunkSize太大了，可以降低数量试试。也可能是这个模型不行
2. **script/js模块解析失败**
   - 目前暂不支持jsx语法，如果项目中使用了jsx语法，可能会报这个错。
   - 对于vue3的项目，对 `withDefaults`、`defineProps`等api有做特殊处理，如果是普通字符串用了这些名字可能会导致出错
   - 因为其它原因导致语法解析失败
3. 启动时报错**Error: EBUSY: resource busy or locked, lstat 'D:\DumpStack.log.tmp'**
   - 把node_modules删了重新装一下就好
