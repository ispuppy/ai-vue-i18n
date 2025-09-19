import type { ILoaderOptions } from "../types/index.ts";
import { BaseUtils } from "./base.ts";

class ScriptLoader extends BaseUtils {
  constructor() {
    super();
  }
  excute(content:string, options: ILoaderOptions) {
    content = this.processNote(content)
  }
  public processNote(code: string): string {
    return code
  }
}