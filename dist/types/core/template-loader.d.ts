import { BaseUtils } from "./base.ts";
import { type ILoaderOptions } from "../types/index.ts";
export declare class TemplateLoader extends BaseUtils {
    path: string;
    constructor(options: ILoaderOptions, path?: string);
    excute(template: string): string;
    private getProcessTemplateTag;
    private processElement;
    private clearNote;
    private processTagAttr;
    private processTemplate;
    private restore;
    private addContext;
}
//# sourceMappingURL=template-loader.d.ts.map