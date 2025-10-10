#!/usr/bin/env node

import fs from 'fs'
import chalk from 'chalk'
import path from 'path'
import { fileURLToPath } from 'url'

try {
  const taregtPath = path.join(process.cwd(), 'ai-vue-i18n.config.js')
  if(fs.existsSync(taregtPath)) {
    console.log(chalk.yellow('config file is aready exist'))
    process.exit(1);
  }
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const templatePath = path.join(__dirname, '../ai-vue-i18n.config.js')
  const content = fs.readFileSync(templatePath, 'utf8')
  fs.writeFileSync(taregtPath, content, 'utf8')
  console.log(chalk.green('config file created successfully'))
} catch (error) {
  console.error(chalk.red('config file created failed:', error.message))
  process.exit(1);
}
