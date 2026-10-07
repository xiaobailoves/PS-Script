/// <reference path="legacy.d.ts" />

namespace LabelPlus {

export enum OptionTextDirection { Keep, Horizontal, Vertical };
export enum OptionDocTemplate { Auto, No, Custom }; // auto choose preset template/no use template/custom template
export enum OptionOutputType { PSD, TIFF, PNG, JPG, _count };
export enum OptionWidthConvert { Keep, ToHalf, ToFull }; // 全角/半角转换（Keep 恒为 0，旧 ini 兼容）
export enum OptionHanConvert { Keep, S2T, T2S };         // 简繁转换方向（数据由用户自行下载；Keep 恒为 0）

export class ImageInfo {
    file: string = "";
    matched_file:string = "";
    index: number = 0;
};

export class CustomOptions {

    // ------------------------------------ not saved options
    source: string = ""; // images source folder
    target: string = ""; // images target folder
    overlayManualSource: string = ""; // overlay manual images folder (涂白文件夹：预处理涂白图片)
    lpTextFilePath: string = ""; // path of labelplus text file
    imageSelected: ImageInfo[] = []; // selected images
    groupSelected: string[] = [];  // selected label group

    // ------------------------------------ saved options
    docTemplate: OptionDocTemplate = OptionDocTemplate.Auto; // image document template option
    docTemplateCustomPath: string = "";  // custom image document template path

    outputType: OptionOutputType = OptionOutputType.PSD; // output image file type
    ignoreNoLabelImg: boolean = false; // ignore images with no label
    noLayerGroup: boolean = false; // do not create group in document for text layers
    notClose: boolean = false; // do not close image document

    font: string = ""; // set font if it is not empty
    fontSize: number = 0; // set font size if neq 0
    textLeading: number = 0; // set auto leading value if neq 0, unit is percent
    textReplace: string = ""; // run text replacing function, if the expression is not empty
    textReplaceRuleFile: string = ""; // 替换规则文件路径（.txt/.yml，与 textReplace 合并；同一源以 textReplace 为准）
    outputLabelIndex: boolean = false; // if true, output label index as text layer
    textDirection: OptionTextDirection = OptionTextDirection.Keep; // text direction option
    textColor: string = ""; // override text color, hex string, "" = disabled
    antiAlias: number = 0; // override anti-alias, 0=disabled, 1=None, 2=Sharp, 3=Crisp, 4=Strong, 5=Smooth
    verticalRoman: boolean = true; // standard vertical roman alignment (脚本端设置，默认启用)
    tateChuYokoPatterns: string = ""; // 直排内横排：自动匹配的文本片段（| 分隔），空 = 关闭
    tsumeChars: string = "";          // 比例间距：套用挤压的字符（如 「」），空 = 关闭
    tsumePercent: number = 0;         // 比例间距百分比 10~90，0 = 关闭
    verticalRomanChars: string = "";  // 直立字符（直排）：对这些字符套用标准直立（标准垂直罗马对齐），空 = 关闭
    autoKerningMetrics: boolean = false; // 字偶间距应用"度量标准"(Metrics)：使用字体自带的两字间距微调
    widthConvert: OptionWidthConvert = OptionWidthConvert.Keep; // 旧版整体宽度转换（仅用于旧配置迁移，运行时不再读取）
    widthDigits: OptionWidthConvert = OptionWidthConvert.Keep;  // 导入时全角/半角转换：数字类
    widthLetters: OptionWidthConvert = OptionWidthConvert.Keep; // …字母类
    widthSymbols: OptionWidthConvert = OptionWidthConvert.Keep; // …标点类（含空格）
    hanConvert: OptionHanConvert = OptionHanConvert.Keep;       // 导入时简繁转换（数据需用户自行下载）
    ppi: number = 0; // override output PPI, 0 means disabled

    actionGroup: string = ""; // action group name
    dialogOverlayLabelGroups: string = ""; // the label groups need dialog overlay layer, split by ","
    dialogOverlayTolerance: number = 16; // dialog overlay tolerance
};

} // namespace LabelPlus
