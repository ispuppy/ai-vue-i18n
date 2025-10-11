import { cleandir } from "rollup-plugin-cleandir";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json'; // 添加JSON插件
import alias from '@rollup/plugin-alias';
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
alias({
  entries: [
    { find: '@', replacement: path.resolve(__dirname, 'src') },
    { find: '@types', replacement: path.resolve(__dirname, 'types') }
  ]
})
export default {
  input: {
    index: "index.ts",
    generate: "src/generate.ts",
  },
  output: [
    {
      dir: "./dist",
      format: "es",
      sourcemap: true,
      preserveModules: false,
    },
  ],
  plugins: [
    cleandir(["dist"]),
    typescript({
      tsconfig: './tsconfig.json',
    }),
    json(), // 添加JSON插件
    resolve(),
    commonjs({ include: /node_modules/ }),
  ],
};
