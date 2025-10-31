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
      dir: 'dist',
      format: 'esm',
      entryFileNames: '[name].esm.js',
      chunkFileNames: '[name]-[hash].esm.js'
    },
    // CJS 格式输出
    {
      dir: 'dist',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      exports: 'named'
    }
  ],
  plugins: [
    cleandir(["dist"]),
    typescript({
      tsconfig: './tsconfig.json',
      // 排除测试文件
      exclude: ['**/__tests__/**', '**/*.test.ts'],
    }),
    json(), // 添加JSON插件
    resolve(),
    commonjs({ include: /node_modules/ }),
  ],
};
