const { pathsToModuleNameMapper } = require('ts-jest')
const tsconfig = require('./tsconfig.json')
const compilerOptions = tsconfig.compilerOptions


module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
  ],
  testEnvironment: 'node',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions?.paths || {}, { prefix: '<rootDir>/' }),
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'node',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  extensionsToTreatAsEsm: ['.ts'],
}
