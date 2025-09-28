import fs from "fs";
import path from "path";

type MessageType = Record<string, string> | null;
class FileOperator {
  messages: MessageType = null;

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

  public async initMessage(path: string) {
    if (!this.messages && fs.existsSync(path)) {
      const fileUrl = this.getFileUrl(path);
      const file = await import(fileUrl);
      this.messages = file.default;
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
}

export const fileOperator = new FileOperator()
