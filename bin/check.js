#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const resolvedPath = join(__dirname, '../dist/generate.esm.js')
  const normalizedPath = resolvedPath.replace(/\\/g, "/");
  const url =  new URL(`file://${normalizedPath}`).href;
  const generateModule = await import(url);
  if(typeof generateModule.checkMessage === 'function'){
    const res = await generateModule.checkMessage();
    if(!res) {
      process.exit(1);
    }
    process.exit(0);
  } else {
    console.error('check function not found in module:', generateModule);
    process.exit(1);
  }
} catch (error) {
  console.error('Error executing check command:', error);
  process.exit(1);
}