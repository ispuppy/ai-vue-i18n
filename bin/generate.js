#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


try {
  const resolvedPath = join(__dirname, '../dist/generate.js')
  const normalizedPath = resolvedPath.replace(/\\/g, "/");
  const url =  new URL(`file://${normalizedPath}`).href;
  const generateModule = await import(url);
  if(typeof generateModule.generate === 'function'){
    generateModule.generate();
  } else {
    console.error('generate function not found in module:', generateModule);
    process.exit(1);
  }
} catch (error) {
  console.error('Error executing generate command:', error);
  process.exit(1);
}