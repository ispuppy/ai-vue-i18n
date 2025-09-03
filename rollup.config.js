import { cleandir } from "rollup-plugin-cleandir";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from '@rollup/plugin-typescript';
export default {
  input: "index.ts",
  output: [
    {
      dir: "./dist",
      format: "es",
      sourcemap: true,
      // preserveModules: true,
    },
  ],
  plugins: [
    cleandir(["dist"]),
    typescript({
      tsconfig: './tsconfig.json',
    }),
    resolve(),
    commonjs({ include: /node_modules/ }),
  ],
};
