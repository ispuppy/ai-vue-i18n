import fs from "fs";
import path from "path";
import type { ILoaderOptions, ITranslationLog } from "../types/index.ts";
import { mergeOptions, validateFileType } from "@/util.ts";

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
  config: ILoaderOptions | null = null
  translationLog: ITranslationLog | null = null
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
    } else {
      console.error(`文件不存在: ${filePath}`);
    }
    return null
  }

  public async getConfig(getNew?: boolean): Promise<ILoaderOptions> {
    if(this.config && !getNew) {
      return this.config as ILoaderOptions
    }
    const configPath = path.join(process.cwd(), 'ai-vue-i18n.config.js')
    const config = await this.getFileContent(configPath)
    if(!config) throw new Error('ai-vue-i18n config not found')
    this.config = mergeOptions(config)
    return getNew ? { ...this.config } :this.config
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

  // 获取所有目标文件
  public getAllFiles(config: ILoaderOptions) {
    const results: string[] = []
    let { targetFiles } = config
    if(!Array.isArray(targetFiles)) {
      targetFiles = [targetFiles]
    }
    
    if(targetFiles.length === 0) {
      throw new Error('targetFiles can not be empty')
    }
    const dfs = (files: string[]) => {
      for(const file of files) {
        const isDirectory = fs.statSync(file).isDirectory()
        const isValid = validateFileType(file, config, isDirectory)
        if(!isValid) {
          continue
        }
        if(isDirectory) {
          dfs(fs.readdirSync(file).map(item => path.join(file, item)))
        } else {
          results.push(file)
        }
      }
    }
    dfs(targetFiles)
    return results
  }

  // 写入翻译文件
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

  // 获取日志内容
  public loadTranslationCache (outputDir: string): ITranslationLog {
    if(this.translationLog) {
      return this.translationLog
    }
    const cachePath = path.join(outputDir, 'translation.json')
    try {
      if (fs.existsSync(cachePath)) {
        this.translationLog = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as ITranslationLog
        return this.translationLog
      }
    } catch (err) {
      console.error('加载翻译日志文件失败:', err)
    }
    return {}
  }

  public updateTranslationCache (key: string, lang: string, text: string) {
    if(!this.translationLog) {
      this.translationLog = {}
    }
    if(!this.translationLog[key]) {
      this.translationLog[key] = {}
    }
    this.translationLog[key][lang] = text
  }

  public saveTranslationCache (outputDir: string) {
    const cachePath = path.join(outputDir, 'translation.json')
    try {
      fs.writeFileSync(cachePath, JSON.stringify(this.translationLog, null, 2))
    } catch (err) {
      console.error('保存翻译日志文件失败:', err)
    }
  }
}

export const fileOperator = new FileOperator()
