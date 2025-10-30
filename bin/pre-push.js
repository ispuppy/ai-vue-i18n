#!/usr/bin/env node

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

const gitHooksPath = path.join(process.cwd(), '.git', 'hooks')
const prePushPath = path.join(gitHooksPath, 'pre-push')

if (!fs.existsSync(gitHooksPath)) {
  fs.mkdirSync(gitHooksPath, { recursive: true });
}
const dirname = path.dirname(new URL(import.meta.url).pathname);
if(fs.existsSync(prePushPath)) {
  const hookContent = fs.readFileSync(prePushPath, 'utf8')
  if(hookContent.includes('check.js')) {
    console.log(chalk.yellow('Hook already exists.'))
    process.exit(1)
  } else {
    const newHookContent = `
      ${hookContent}\n
      node ${path.posix.join(dirname, 'check.js')}\n
    `
    fs.writeFileSync(prePushPath, newHookContent, 'utf8');
  }
} else {
  const hookContent = `#!/bin/sh
  node ${path.posix.join(dirname, 'check.js')}
  `
  fs.writeFileSync(prePushPath, hookContent, 'utf8')
}

fs.chmodSync(prePushPath, '755')
console.log(chalk.green('Hook installed successfully.'))