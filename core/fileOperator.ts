import fs from "fs";
import path from "path";
import type { ILoaderOptions } from "../types/index.ts";

export type MessageType = Record<string, string> | null;
type ILanguageFiles = Record<string, { 
  messages: MessageType,
  update: boolean
 }>
const exportMap: Record<string, string> = {
  'ESM': 'export default',
  'CJS': 'module.exports =',
}
class FileOperator {
  messages: MessageType = null;
  languageFiles: ILanguageFiles = {}
  config: Partial<ILoaderOptions> | null = null
  private getFileUrl(filePath: string): string {
    try {
      // 确保路径是绝对路径并转换为 file:// URL
      const resolvedPath = path.resolve(filePath);
      // 处理 Windows 路径分隔符
      const normalizedPath = resolvedPath.replace(/\\/g, "/");
      // 创建符合 ESM 规范的 file:// URL
      return new URL(`file://${normalizedPath}`).href;
    } catch (error) {
      console.error("转换文件路径为 URL 失败:", error);
      // 降级处理：直接返回标准化后的路径
      return filePath.replace(/\\/g, "/");
    }
  }

  private getExportStatement(type: string) {
    type = type.toUpperCase()
    return exportMap[type] || exportMap['ESM']
  }

  public async getFileContent(filePath: string) {
    if(fs.existsSync(filePath)) {
      try { 
        const fileUrl = this.getFileUrl(filePath);
        const file = await import(fileUrl);
        return file.default;
      } catch (error) {
        try {
          const { createRequire } = await import('node:module');
          const crequire = createRequire(__filename);
          const file = crequire(filePath);
          return file
        } catch (error) {
          console.error(`导入文件失败: ${filePath}`, error);
        }
      }
    }
    return null
  }

  public async getConfig() {
    if(this.config) {
      return this.config
    }
    const configPath = path.join(process.cwd(), 'ai-vue-i18n.config.js')
    const config = await this.getFileContent(configPath)
    this.config = config
    return config
  }

  public async initMessage(path: string, clear?: boolean) {
    if(clear) {
      this.messages = null
      return
    }
    if (!this.messages) {
      const message = await this.getFileContent(path)
      this.messages = message
    }
  }

  public getMessage(key: string) {
    return this.messages?.[key]
  }

  public setMessage(key: string, value: string) {
    if(!this.messages) {
      this.messages = {}
    }
    this.messages[key] = value
  }

  public getAllFiles(targetFile: string | string[], excludeFiles: string[] = []) {
    const results: string[] = []
    if(!Array.isArray(targetFile)) {
      targetFile = [targetFile]
    }
    // 判断targetFile是否是目录
    if(targetFile.length === 0) {
      throw new Error('targetFile can not be empty')
    }
    const dfs = (files: string[]) => {
      for(const file of files) {
        if(excludeFiles?.includes(file)) {
          continue
        }
        if(fs.statSync(file).isDirectory()) {
          dfs(fs.readdirSync(file).map(item => path.join(file, item)))
        } else {
          if(['.vue', '.js', '.ts'].includes(path.extname(file))) {
            results.push(file)
          }
        }
      }
    }
    dfs(targetFile)
    return results
  }

  public async writeMessages(outputDir: string, localeFile: string, exportType: string = 'ESM', messages: MessageType = null) {
    if(!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    const exportStatement = this.getExportStatement(exportType)
    const content = `${exportStatement} ${JSON.stringify(messages, null, 2)}`
    fs.writeFileSync(localeFile, content)
  }

  // 更新翻译文件中的消息
  public updateTranslateMessages(key: string, id: string, text: string) {
    const targetFile = this.languageFiles[key]
    if(targetFile) {
      if(!targetFile.messages) {
        targetFile.messages = {}
      }
      targetFile.messages[id] = text
      targetFile.update = true
    }
  }

  // 初始化设置翻译文件内容
  public setTotalTranslateMessages(languageFiles: Record<string, MessageType>, clearInexistence: boolean = false) {
    this.languageFiles = Object.fromEntries(Object.entries(languageFiles).map(([key, value]) => {
      let needUpdate = false
      if(clearInexistence) {
        const newMessages: MessageType = {}
        for(const k in value) {
          if(this.getMessage(k)) {
            newMessages[k] = value[k] as string
          } else {
            needUpdate = true
          }
        }
        value = newMessages
      }
      return [key, {
        messages: value,
        update: needUpdate
      }]
    }))
  }

  // 保存翻译文件
  public saveLanguageFiles(outputDir: string, exportType?: string) {
    for(const key in this.languageFiles) {
      const targetFile = this.languageFiles[key]!
      if(targetFile.update) {
        const localeFile = path.join(outputDir, `${key}.js`)
        this.writeMessages(outputDir, localeFile, exportType, targetFile.messages)
      }
    }
  }
}

export const fileOperator = new FileOperator()
