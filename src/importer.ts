/// <reference path="legacy.d.ts" />
/// <reference path="custom_options.ts" />
/// <reference path="common.ts" />
/// <reference path="text_parser.ts" />
/// <reference path="dialog_clear.ts" />
/// <reference path="han_conv.ts" />

namespace LabelPlus {

// global var
let opts: CustomOptions | null = null;
let textReplace: TextReplaceInfo = [];

// 中止请求：ESC 键
// 注：进度窗口上的按钮在脚本运行期间收不到点击事件（PS 不派发 ScriptUI 事件），
// 因此中止统一由 ESC 键轮询实现（keyboardState 直接读键盘状态，不依赖事件派发）
function shouldAbort(): boolean {
    return ScriptUI.environment.keyboardState['escape'];
}

// 当前使用的模板是否已包含"标准垂直罗马对齐"（_roman 模板已烘焙该属性）
// 已包含时跳过脚本端写入，保证速度
let templateHasVerticalRoman = false;

// 空文本标签计数（内容为空时跳过，不创建文本图层）
let skippedEmptyLabels = 0;

// 动作组中实际存在的动作名缓存（导入前枚举一次）
// 注：对不存在的动作调用 doAction 播放失败一次约耗时 1~2 秒，必须提前过滤
let availableActions: { [key: string]: boolean } | null = null;
let unavailableActionWarned: { [key: string]: boolean } = {};

// 动作是否存在于当前动作组；不存在时每次导入只提示一次
function actionExists(action: string): boolean {
    if (availableActions === null) // 未能枚举时按“存在”处理，退回直接调用
        return true;
    if (availableActions[action] === true)
        return true;
    if (unavailableActionWarned[action] !== true) {
        log("action \"" + action + "\" not found in action group, skipped");
        unavailableActionWarned[action] = true;
    }
    return false;
}

interface Group {
    layerSet?: LayerSet;
    template?: ArtLayer;
};
type GroupDict = { [key: string]: Group };

interface LabelInfo {
    index: number;
    x: number;
    y: number;
    group: string;
    contents: string;
};

interface ImageWorkspace {
    doc: Document;

    bgLayer: ArtLayer;
    textTemplateLayer: ArtLayer;
    dialogOverlayLayer: ArtLayer;
    overlayManualLayer: ArtLayer | null; // 涂白文件夹载入的图层（未启用时为 null）

    pendingDelLayerList: ArtLayer[];
    groups: GroupDict;

    wPx: number;             // 画布像素宽（缓存，避免逐标签查询文档尺寸）
    hPx: number;             // 画布像素高
    layerPrototypes: { [key: string]: ArtLayer }; // 每个分组已完成样式的首个文字图层，后续标签直接复制
};

interface ImageDocInfo {
    ws: ImageWorkspace;
    name: string;
    name_pair: string;
    labels: LpLabel[];
    textColor?: SolidColor; // pre-computed text color
};

interface ImportResult {
    ok: boolean;
    aborted: boolean; // 用户中止，调用方应丢弃当前图片（不保存）
};

function importLabel(img: ImageDocInfo, label: LabelInfo): boolean
{
    assert(opts !== null);

    // 内置文本转换（先于自定义替换规则）：全角/半角 → 简繁。
    // 必须在这里完成：图层内容、applyLabelTypography 的区间计算、原型缓存都基于同一份 label.contents
    let wd = (opts.widthDigits !== undefined) ? opts.widthDigits : OptionWidthConvert.Keep;
    let wl = (opts.widthLetters !== undefined) ? opts.widthLetters : OptionWidthConvert.Keep;
    let ws = (opts.widthSymbols !== undefined) ? opts.widthSymbols : OptionWidthConvert.Keep;
    if (wd !== OptionWidthConvert.Keep || wl !== OptionWidthConvert.Keep || ws !== OptionWidthConvert.Keep) {
        label.contents = convertWidth(label.contents, wd, wl, ws);
    }
    if (opts.hanConvert !== undefined && opts.hanConvert !== OptionHanConvert.Keep) {
        label.contents = hanConvConvert(label.contents, opts.hanConvert); // 未载入时原样返回（导入前已预载）
    }

    // 替换文本（split/join 语义，避免替换目标包含原文时死循环）——自定义规则最后执行，可修正上面的转换结果
    if (opts.textReplace) {
        for (let k = 0; k < textReplace.length; k++) {
            label.contents = label.contents.split(textReplace[k].from).join(textReplace[k].to);
        }
    }

    // 跳过空文本标签：空字符串赋给图层名/文本内容会让 PS 报错（对象"图层"当前不可用）
    if (label.contents.trim() === "") {
        log("label " + label.index + " is empty, skipped");
        skippedEmptyLabels++;
        return true;
    }

    // import the index of the Label
    if (opts.outputLabelIndex) {
        let o: TextInputOptions = {
            template: img.ws.textTemplateLayer,
            direction: Direction.HORIZONTAL,
            font: "Arial",
            size: (opts.fontSize !== 0) ? UnitValue(opts.fontSize, "pt") : undefined,
            lgroup: img.ws.groups["_Label"].layerSet,
        };
        createStyledTextLayer(img, "_Label", String(label.index), label.x * img.ws.wPx, label.y * img.ws.hPx, o);
    }

    // 确定文字方向
    let textDir: Direction | undefined;
    switch (opts.textDirection) {
    case OptionTextDirection.Keep:       textDir = undefined; break;
    case OptionTextDirection.Horizontal: textDir = Direction.HORIZONTAL; break;
    case OptionTextDirection.Vertical:   textDir = Direction.VERTICAL; break;
    }

    // 导出文本，设置的优先级大于模板，无模板时做部分额外处理
    let textLayer: ArtLayer;
    let o: TextInputOptions = {
        template: img.ws.groups[label.group].template,
        font: (opts.font != "") ? opts.font : undefined,
        direction: textDir,
        lgroup: img.ws.groups[label.group].layerSet,
        lending: opts.textLeading ? opts.textLeading : undefined,
        color: img.textColor,
        antiAlias: (opts.antiAlias > 0) ? opts.antiAlias : undefined,
        autoKerningMetrics: (opts.autoKerningMetrics) ? true : undefined,
    };

    // 使用模板时，用户不设置字体大小，不做更改；不使用模板时，如果用户不设置大小，自动调整到合适的大小
    if (opts.docTemplate === OptionDocTemplate.No) {
        let proper_size = UnitValue(min(img.ws.doc.width.as("pt"), img.ws.doc.height.as("pt")) / 90.0, "pt");
        o.size = (opts.fontSize !== 0) ? UnitValue(opts.fontSize, "pt") : proper_size;
    } else {
        o.size = (opts.fontSize !== 0) ? UnitValue(opts.fontSize, "pt") : undefined;
    }
    textLayer = createStyledTextLayer(img, label.group, label.contents, label.x * img.ws.wPx, label.y * img.ws.hPx, o);

    // 执行动作,名称为分组名
    if (opts.actionGroup && actionExists(label.group)) {
        img.ws.doc.activeLayer = textLayer;
        let result = doAction(label.group, opts.actionGroup);
        log("run action " + label.group + "[" + opts.actionGroup + "]..." + (result ? "done" : "not found or failed"));
    }
    return true;
}

function importImage(img: ImageDocInfo): ImportResult
{
    assert(opts !== null);

    // run action _start
    if (opts.actionGroup && actionExists("_start")) {
        img.ws.doc.activeLayer = img.ws.doc.layers[img.ws.doc.layers.length - 1];
        let result = doAction("_start", opts.actionGroup);
        log("run action _start[" + opts.actionGroup + "]..." + (result ? "done" : "not found or failed"));
    }

    // 找出需要涂白的标签,记录他们的坐标,执行涂白
    if (opts.dialogOverlayLabelGroups) {
        let points = new Array();
        let groups = opts.dialogOverlayLabelGroups.split(",");
        for (let j = 0; j < img.labels.length; j++) {
            let l = img.labels[j];
            if (groups.indexOf(l.group) >= 0) {
                points.push({ x: l.x, y: l.y });
            }
        }

        let contract = UnitValue(2, 'pt');
        let tolerance = opts.dialogOverlayTolerance;
        log("dialogClear() ,contract_px=" + contract + ",tolerance=" + tolerance);
        if (!dialogClear(img.ws.doc, img.ws.bgLayer, img.ws.dialogOverlayLayer, points, tolerance, contract, shouldAbort)) {
            log("User cancelled during dialog overlay");
            return { ok: true, aborted: true }; // 中止：交由调用方丢弃当前图片
        }
        delArrayElement<ArtLayer>(img.ws.pendingDelLayerList, img.ws.dialogOverlayLayer); // do not delete dialog-overlay-layer
    }

    // pre-compute text color once per image
    if (opts.textColor !== "") {
        img.textColor = hexToColor(opts.textColor);
    }

    // 遍历LabelData
    for (let j = 0; j < img.labels.length; j++) {
        if (shouldAbort()) {
            log("User cancelled during label import");
            return { ok: true, aborted: true }; // 中止：交由调用方丢弃当前图片
        }
        let l = img.labels[j];
        if (opts.groupSelected.indexOf(l.group) == -1) // the group did not select by user, return directly
            continue;

        let label_info: LabelInfo = {
            index: j + 1,
            x: l.x,
            y: l.y,
            group: l.group,
            contents: l.contents,
        };
        log("import label " + label_info.index + "...");
        importLabel(img, label_info);
    }

    // adjust layer order
    if (img.ws.bgLayer) {
        if (img.ws.overlayManualLayer !== null) {
            log('move "overlay-manual" before "bg"');
            img.ws.overlayManualLayer.move(img.ws.bgLayer, ElementPlacement.PLACEBEFORE);
        }
        if (opts.dialogOverlayLabelGroups !== "") {
            log('move "dialog-overlay" before "bg"');
            img.ws.dialogOverlayLayer.move(
                (img.ws.overlayManualLayer !== null) ? img.ws.overlayManualLayer : img.ws.bgLayer,
                ElementPlacement.PLACEBEFORE);
        }
    }

    // remove unnecessary temp layers
    log('remove unnecessary Layer/LayerSet...');
    for (let i = img.ws.pendingDelLayerList.length - 1; i >= 0; i--) { // Layer
        img.ws.pendingDelLayerList[i].remove();
    }

    // run action _end
    // 注意：空分组文件夹在 _end 之后再清理——动作可能按名字引用与分组同名的文件夹，
    // 若先清理，引用了"空分组"的动作会报错（对象"图层"xxx当前不可用）
    if (opts.actionGroup && actionExists("_end")) {
        img.ws.doc.activeLayer = img.ws.doc.layers[img.ws.doc.layers.length - 1];
        let result = doAction("_end", opts.actionGroup);
        log("run action _end[" + opts.actionGroup + "]..." + (result ? "done" : "not found or failed"));
    }

    // remove empty group LayerSets
    for (let k in img.ws.groups) { // LayerSet
        if (img.ws.groups[k].layerSet !== undefined) {
            if (img.ws.groups[k].layerSet?.artLayers.length === 0) {
                img.ws.groups[k].layerSet?.remove();
            }
        }
    }
    return { ok: true, aborted: false };
}

// 在涂白文件夹中查找与页面匹配的图片文件（支持不同后缀名匹配）
function findOverlayManualFile(overlayManualSource: string, originalFilename: string): File | null
{
    let exactMatchFile = new File(overlayManualSource + dirSeparator + originalFilename);
    if (exactMatchFile.exists) {
        return exactMatchFile;
    }
    let nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf("."));
    if (nameWithoutExt === "") {
        nameWithoutExt = originalFilename;
    }
    for (let i = 0; i < image_suffix_list.length; i++) {
        let candidate = new File(overlayManualSource + dirSeparator + nameWithoutExt + image_suffix_list[i]);
        if (candidate.exists) {
            log("overlay-manual matched (different extension): " + candidate.fsName);
            return candidate;
        }
    }
    return null;
}

function openImageWorkspace(img_filename: string, template_path: string, templateDoc: Document | null = null,
                            extraGroups: string[] = []): ImageWorkspace | null
{
    assert(opts !== null);

    // open background image
    let bgDoc: Document;

    img_filename = img_filename.substring(0, img_filename.lastIndexOf('.'));
    for (let i = 0; i < image_suffix_list.length; i++) {
        if (FileIsExists(opts.source + dirSeparator + img_filename + image_suffix_list[i])){
            img_filename = img_filename + image_suffix_list[i];
            break;
        }
    }
    try {
        let bgFile = new File(opts.source + dirSeparator + img_filename);
        bgDoc = app.open(bgFile);
    } catch {
        return null; //note: do not exit if image not exist
    }

    // if template is enabled, open template; or create a new file
    let wsDoc: Document; // workspace document
    if (opts.docTemplate == OptionDocTemplate.No) {
        wsDoc = app.documents.add(bgDoc.width, bgDoc.height, bgDoc.resolution, bgDoc.name, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
        wsDoc.activeLayer.name = TEMPLATE_LAYER.IMAGE;
    } else {
        try {
            // 优先从已打开的模板文档复制；无缓存时回退为从磁盘打开
            /// @ts-ignore ts声明文件可能有误，duplicate()返回Document对象
            wsDoc = (templateDoc !== null) ? <Document> templateDoc.duplicate() : app.open(new File(template_path));
        } catch (e) {
            log_err("template file open failed: " + template_path);
            bgDoc.close(SaveOptions.DONOTSAVECHANGES);
            return null;
        }
        app.activeDocument = wsDoc;
        wsDoc.resizeImage(undefined, undefined, bgDoc.resolution);
        wsDoc.resizeCanvas(bgDoc.width, bgDoc.height);
    }

    // wsDoc is clean, check template elements, if a element not exist
    let bgLayer: ArtLayer;
    let textTemplateLayer: ArtLayer;
    let dialogOverlayLayer: ArtLayer;
    let overlayManualLayer: ArtLayer | null = null;
    let pendingDelLayerList: ArtLayer[] = new Array();
    {
        // add all artlayers to the pending delete list
        for (let i = 0; i < wsDoc.artLayers.length; i++) {
            let layer: ArtLayer = wsDoc.artLayers[i];
            pendingDelLayerList.push(layer);
        }

        // bg layer template
        try { bgLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.IMAGE); }
        catch {
            bgLayer = wsDoc.artLayers.add();
            bgLayer.name = TEMPLATE_LAYER.IMAGE;
        }
        // text layer template
        try { textTemplateLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.TEXT); }
        catch {
            textTemplateLayer = wsDoc.artLayers.add();
            textTemplateLayer.name = TEMPLATE_LAYER.TEXT;
            pendingDelLayerList.push(textTemplateLayer); // pending delete
        }
        // dialog overlay layer template
        try { dialogOverlayLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.DIALOG_OVERLAY); }
        catch {
            dialogOverlayLayer = wsDoc.artLayers.add();
            dialogOverlayLayer.name = TEMPLATE_LAYER.DIALOG_OVERLAY;
            pendingDelLayerList.push(dialogOverlayLayer); // pending delete when overlay is off
        }
    }

    // import bgDoc to wsDoc:
    // if bgDoc has only a layer, select all and copy to bg layer, for applying bg layer template
    // if bgDoc has multiple layers, move all layers after bg layer (bg layer template is invalid)
    if ((bgDoc.artLayers.length == 1) && (bgDoc.layerSets.length == 0)) {
        app.activeDocument = bgDoc;
        bgDoc.selection.selectAll();
        bgDoc.selection.copy();
        app.activeDocument = wsDoc;
        wsDoc.activeLayer = bgLayer;
        wsDoc.paste();
        delArrayElement<ArtLayer>(pendingDelLayerList, bgLayer); // keep bg layer
    } else {
        app.activeDocument = bgDoc;
        let item = bgLayer;
        for (let i = 0; i < bgDoc.layers.length; i++) {
            item = bgDoc.layers[i].duplicate(item, ElementPlacement.PLACEAFTER);
        }
    }
    // override PPI
    if (opts.ppi !== 0) {
        wsDoc.resizeImage(undefined, undefined, opts.ppi, ResampleMethod.NONE);
        log("override PPI to " + opts.ppi);
    }

    bgDoc.close(SaveOptions.DONOTSAVECHANGES);
    app.activeDocument = wsDoc; // 确保工作文档为活动文档（模板文档缓存时可能处于活动状态）

    // 涂白文件夹（overlay-manual）：载入预处理的涂白图片；未匹配到文件时跳过
    if (opts.overlayManualSource !== "") {
        let overlayFile = findOverlayManualFile(opts.overlayManualSource, img_filename);
        if (overlayFile !== null) {
            try {
                let overlayDoc = app.open(overlayFile);
                app.activeDocument = overlayDoc;
                overlayDoc.selection.selectAll();
                overlayDoc.selection.copy();
                overlayDoc.close(SaveOptions.DONOTSAVECHANGES);

                try {
                    overlayManualLayer = wsDoc.artLayers.getByName(TEMPLATE_LAYER.OVERLAY_MANUAL);
                } catch {
                    overlayManualLayer = wsDoc.artLayers.add();
                    overlayManualLayer.name = TEMPLATE_LAYER.OVERLAY_MANUAL;
                }
                app.activeDocument = wsDoc;
                wsDoc.activeLayer = overlayManualLayer;
                wsDoc.paste();
                log("overlay-manual loaded: " + overlayFile.fsName);
            } catch (e) {
                log_err("overlay-manual failed: " + e);
                overlayManualLayer = null;
            }
        } else {
            log("overlay-manual: no matched file, skipped (" + img_filename + ")");
        }
    }

    // 若文档类型为索引色模式 更改为RGB模式
    if (wsDoc.mode == DocumentMode.INDEXEDCOLOR) {
        log("wsDoc.mode is INDEXEDCOLOR, set RGB");
        wsDoc.changeMode(ChangeMode.RGB);
    }

    // 分组
    let groups: GroupDict = {};
    for (let i = 0; i < opts.groupSelected.length; i++) {
        let name = opts.groupSelected[i];
        let tmp: Group = {};

        // 创建PS中图层分组
        if (!opts.noLayerGroup) {
            tmp.layerSet = wsDoc.layerSets.add();
            tmp.layerSet.name = name;
            tmp.layerSet.blendMode = BlendMode.NORMAL;
        }
        // 尝试寻找分组模板，找不到则使用默认文本模板
        if (opts.docTemplate !== OptionDocTemplate.No) {
            let l: ArtLayer | undefined;
            try {
                l = wsDoc.artLayers.getByName(name);
            } catch { };
            tmp.template = (l !== undefined) ? l : textTemplateLayer;
        }
        groups[name] = tmp; // add
    }

    // 为动作预建其余分组的同名文件夹（未勾选导入的分组；空文件夹将在收尾时被清理）
    for (let i = 0; i < extraGroups.length; i++) {
        let name = extraGroups[i];
        if (name.trim() === "" || groups[name] !== undefined)
            continue;
        let tmp: Group = {};
        tmp.layerSet = wsDoc.layerSets.add();
        tmp.layerSet.name = name;
        tmp.layerSet.blendMode = BlendMode.NORMAL;
        groups[name] = tmp;
    }
    if (opts.outputLabelIndex) {
        let tmp: Group = {};
        tmp.layerSet = wsDoc.layerSets.add();
        tmp.layerSet.name = "Label";
        groups["_Label"] = tmp;
    }

    let ws: ImageWorkspace = {
        doc: wsDoc,
        bgLayer: bgLayer,
        textTemplateLayer: textTemplateLayer,
        dialogOverlayLayer: dialogOverlayLayer,
        overlayManualLayer: overlayManualLayer,
        pendingDelLayerList: pendingDelLayerList,
        groups: groups,
        wPx: wsDoc.width.as("px"),
        hPx: wsDoc.height.as("px"),
        layerPrototypes: {},
    };
    return ws;
}

function closeImage(img: ImageDocInfo, saveType: OptionOutputType = OptionOutputType.PSD): boolean
{
    assert(opts !== null);

    // 保存文件
    let fileOut = new File(opts.target + dirSeparator + img.name);
    let asCopy = false;
    let options: any;
    switch (saveType) {
    case OptionOutputType.PSD:
        options = PhotoshopSaveOptions;
        break;
    case OptionOutputType.TIFF:
        options = TiffSaveOptions;
        break;
    case OptionOutputType.PNG:
        options = PNGSaveOptions;
        asCopy = true;
        break;
    case OptionOutputType.JPG:
        options = new JPEGSaveOptions();
        options.quality = 10;
        asCopy = true;
        break;
    default:
        log_err(img.name_pair + ": unkown save type " + saveType);
        return false
    }

    let extensionType = Extension.LOWERCASE;
    img.ws.doc.saveAs(fileOut, options, asCopy, extensionType);

    // 关闭文件
    if (!opts.notClose)
        img.ws.doc.close(SaveOptions.DONOTSAVECHANGES);

    return true;
}

export function importFiles(custom_opts: CustomOptions): boolean
{
    opts = custom_opts;
    skippedEmptyLabels = 0;
    availableActions = null;
    unavailableActionWarned = {};

    /// @ts-ignore
    app.refresh(false); // speed up batch processing
    /// @ts-ignore
    var oldDialogs = app.displayDialogs;
    /// @ts-ignore
    app.displayDialogs = DialogModes.NO;

    /// @ts-ignore
    var progressWin: any = null;
    let templateDoc: Document | null = null;
    let aborted = false;

    try {
        log("Start import process!!!");
        log("Properties start ------------------");
        log(Stdlib.listProps(opts));
        log("Properties end   ------------------");

        //解析LabelPlus文本
        let lpFile = lpTextParser(opts.lpTextFilePath);
        if (lpFile == null) {
            log_err("error: " + I18n.ERROR_PARSER_LPTEXT_FAIL);
            return false;
        }
        log("parse lptext done...");

        // 替换文本解析：文本框表达式 + 规则文件（同一「源」以文本框为准：文件规则先执行、同源丢弃，文本框规则最后执行）
        if (opts.textReplace || opts.textReplaceRuleFile) {
            let exprRules: TextReplaceInfo = [];
            if (opts.textReplace) {
                let tmp = textReplaceReader(opts.textReplace);
                if (tmp === null) {
                    log_err("error: " + I18n.ERROR_TEXT_REPLACE_EXPRESSION);
                    return false;
                }
                exprRules = tmp;
            }
            let fileRules: TextReplaceInfo = [];
            if (opts.textReplaceRuleFile && opts.textReplaceRuleFile !== "") {
                let fr = textReplaceReaderFromFile(opts.textReplaceRuleFile);
                if (fr === null) {
                    log_err("error: " + I18n.ERROR_RULE_FILE_NOT_FOUND + " " + opts.textReplaceRuleFile);
                    alert(I18n.ERROR_RULE_FILE_NOT_FOUND + "\n" + opts.textReplaceRuleFile, "error", true);
                    return false;
                }
                fileRules = fr;
            }
            let exprSources: { [k: string]: boolean } = {};
            for (let i = 0; i < exprRules.length; i++) {
                exprSources[exprRules[i].from] = true;
            }
            let merged: TextReplaceInfo = [];
            for (let i = 0; i < fileRules.length; i++) {
                if (exprSources[fileRules[i].from] !== true) {
                    merged.push(fileRules[i]);
                }
            }
            for (let i = 0; i < exprRules.length; i++) {
                merged.push(exprRules[i]);
            }
            textReplace = merged;
            log("parse textreplace done (" + merged.length + " rules" + (opts.textReplaceRuleFile ? ", file: " + opts.textReplaceRuleFile : "") + ")");
        }

        // 简繁转换：选了方向但数据未安装/损坏 → 中止导入（数据由用户自行下载）
        if (opts.hanConvert !== undefined && opts.hanConvert !== OptionHanConvert.Keep) {
            if (!hanConvIsInstalled(opts.hanConvert)) {
                log_err("error: " + I18n.ERROR_HAN_DATA_NOT_INSTALLED);
                alert(I18n.ERROR_HAN_DATA_NOT_INSTALLED, "error", true);
                return false;
            }
            let hanErr = hanConvPreload(opts.hanConvert);
            if (hanErr !== null) {
                log_err("error: " + hanErr);
                alert(hanErr, "error", true);
                return false;
            }
            log("han convert data ready (dir=" + opts.hanConvert + ")");
        }

        // 枚举动作组内实际存在的动作名（不存在的动作直接跳过）
        // 注：doAction 对不存在的动作播放失败一次约耗时 1~2 秒
        if (opts.actionGroup) {
            try {
                let sets = Stdlib.getActionSets();
                let names: { [key: string]: boolean } = {};
                for (let i = 0; i < sets.length; i++) {
                    if (sets[i].name === opts.actionGroup) {
                        for (let j = 0; j < sets[i].actions.length; j++) {
                            names[sets[i].actions[j]] = true;
                        }
                        break;
                    }
                }
                availableActions = names;
                let action_names: string[] = [];
                for (let k in names) action_names.push(k);
                log("action group \"" + opts.actionGroup + "\" cached: [" + action_names.join(", ") + "]");
            } catch (e) {
                log("enumerate action group failed, fallback to direct call: " + e);
            }
        }

        // 动作兼容：预建 LP 文本中所有分组的同名文件夹（含未勾选导入的分组），
        // 避免动作按名字引用“框内”“框外”等文件夹时报“对象‘图层’xxx当前不可用”
        let actionCompatGroups: string[] = [];
        if (opts.actionGroup && !opts.noLayerGroup) {
            actionCompatGroups = lpFile.groups;
            log("pre-create group folders for actions: " + actionCompatGroups.join(", "));
        }

        // 确定doc模板文件
        let template_path: string = "";
        switch (opts.docTemplate) {
        case OptionDocTemplate.Custom:
            template_path = opts.docTemplateCustomPath;
            if (!FileIsExists(template_path)) {
                log_err("error: " + I18n.ERROR_NOT_FOUND_TEMPLATE + " " + template_path);
                return false;
            }
            break;
        case OptionDocTemplate.Auto:
            let tempdir = GetScriptFolder() + dirSeparator + "ps_script_res" + dirSeparator;
            let lang = app.locale.split("_")[0].toLocaleLowerCase();

            let try_list: string[] = [];
            if (opts.verticalRoman) {
                try_list = [
                    tempdir + lang + "_roman.psd",
                    tempdir + "en_roman.psd",
                    tempdir + lang + ".psd",
                    tempdir + "en.psd"
                ];
            } else {
                try_list = [
                    tempdir + lang + ".psd",
                    tempdir + "en.psd"
                ];
            }
            for (let i = 0; i < try_list.length; i++) {
                if (FileIsExists(try_list[i])) {
                    template_path = try_list[i];
                    break;
                }
            }
            if (template_path === "") {
                log_err("error: " + I18n.ERROR_PRESET_TEMPLATE_NOT_FOUND);
                return false;
            }
            log("auto match template: " + template_path);
            break;
        case OptionDocTemplate.No:
        default:
            log("template not used");
            break;
        }

        // 记录模板是否已自带罗马对齐（_roman 模板）；已带则跳过脚本端写入
        templateHasVerticalRoman = (template_path !== "") && (template_path.indexOf("_roman") >= 0);
        if (templateHasVerticalRoman) {
            log("template already provides vertical roman alignment, skip script-side write");
        }

        // 模板文档整个批次只打开一次，之后每张图直接复制，避免逐张从磁盘打开
        if (template_path !== "") {
            try {
                templateDoc = app.open(new File(template_path));
                log("open template once: " + template_path);
            } catch (e) {
                log_err("error: " + I18n.ERROR_FILE_OPEN_FAIL + " " + template_path);
                return false;
            }
        }

        // progress palette
        /// @ts-ignore
        progressWin = new Window('palette', I18n.APP_NAME + " " + VERSION, [200, 200, 500, 300]);
        /// @ts-ignore
        var progressLabel = progressWin.add('statictext', [30, 20, 470, 45], I18n.PROGRESS_PREPARING);
        /// @ts-ignore
        progressWin.add('statictext', [30, 50, 470, 75], I18n.HINT_ESC_STOP);
        /// @ts-ignore
        progressWin.center();
        /// @ts-ignore
        progressWin.show();

        // 遍历所选图片
        for (let i = 0; i < opts.imageSelected.length; i++) {
            /// @ts-ignore
            progressLabel.text = I18n.PROGRESS_PROCESSING + (i + 1) + "/" + opts.imageSelected.length + " — " + opts.imageSelected[i].file;
            /// @ts-ignore
            progressWin.update();
            if (shouldAbort()) {
                aborted = true;
                log("User cancelled, stop processing remaining images");
                break;
            }
            let orgin_name :string = opts.imageSelected[i].file; // 翻译文件中的图片文件名
            let matched_name: string = opts.imageSelected[i].matched_file;
            let name_pair = LabelPlus.str_filename_pair(orgin_name, matched_name);

            log(name_pair + 'in processing...' );
            if (opts.ignoreNoLabelImg && lpFile?.images[orgin_name].length == 0) { // ignore img with no label
                log('no label, ignored...');
                continue;
            }
            let ws = openImageWorkspace(matched_name, template_path, templateDoc, actionCompatGroups);
            if (ws == null) {
                log_err(name_pair + ": " + I18n.ERROR_FILE_OPEN_FAIL);
                continue;
            }

            let img_info: ImageDocInfo = {
                ws: ws,
                name: matched_name,
                name_pair: name_pair,
                labels: lpFile.images[orgin_name],
            };
            let import_result = importImage(img_info);
            if (import_result.aborted) {
                aborted = true;
                log(name_pair + ": aborted, discard current image");
                // 不保存半成品：未勾选“导入后不关闭文档”时直接丢弃关闭
                if (!opts.notClose)
                    img_info.ws.doc.close(SaveOptions.DONOTSAVECHANGES);
                log("User cancelled, stop processing remaining images");
                break;
            }
            if (!import_result.ok) {
                log_err(name_pair + ": import label failed");
            }
            if (!closeImage(img_info, opts.outputType)) {
                log_err(name_pair + ": " + I18n.ERROR_FILE_SAVE_FAIL);
            }
            // 释放 Photoshop 缓存（撤销历史、剪贴板等），避免批量导入时内存持续增长
            /// @ts-ignore
            app.purge(PurgeTarget.ALLCACHES);
            log(name_pair + ": done");
        }
        if (skippedEmptyLabels > 0) {
            log(skippedEmptyLabels + " empty label(s) skipped");
        }
        log(aborted ? "Aborted by user!" : "All Done!");
        return true;
    }
    finally {
        // 无论正常结束、提前返回还是异常，都恢复运行环境
        if (progressWin) {
            try { progressWin.close(); } catch (e) { }
        }
        if (templateDoc) {
            try { templateDoc.close(SaveOptions.DONOTSAVECHANGES); } catch (e) { }
        }
        /// @ts-ignore
        app.displayDialogs = oldDialogs;
        /// @ts-ignore
        app.refresh(true);
    }
};

// 文本导入选项，参数为undefined时表示不设置该项
interface TextInputOptions {
    template?: ArtLayer;     // 文本图层模板
    font?: string;
    size?: UnitValue;
    direction?: Direction;
    lgroup?: LayerSet;
    lending?: number;        // 自动行距
    color?: SolidColor;      // 文本颜色
    antiAlias?: number;      // 消除锯齿 1=None 2=Sharp 3=Crisp 4=Strong 5=Smooth
    autoKerningMetrics?: boolean; // 字偶间距应用"度量标准"(Metrics)
};

// hex颜色字符串转SolidColor, 如 "#ff0000" 或 "ff0000"
function hexToColor(hex: string): SolidColor {
    hex = hex.replace("#", "");
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    let color = new SolidColor();
    color.rgb.red = r;
    color.rgb.green = g;
    color.rgb.blue = b;
    return color;
}

// 创建文本图层（xPx/yPx 为画布像素坐标）
function newTextLayer(doc: Document, text: string, xPx: number, yPx: number, topts: TextInputOptions = {}): ArtLayer
{
    let artLayerRef: ArtLayer;
    let textItemRef: TextItem;

    // 从模板创建，可以保证图层的所有格式与模板一致
    if (topts.template) {
        /// @ts-ignore ts声明文件有误，duplicate()返回ArtLayer对象，而不是void
        artLayerRef = <ArtLayer> topts.template.duplicate();
        textItemRef = artLayerRef.textItem;
    }
    else {
        artLayerRef = doc.artLayers.add();
        artLayerRef.kind = LayerKind.TEXT;
        textItemRef = artLayerRef.textItem;
    }

    if (topts.size)
        textItemRef.size = topts.size;

    if (topts.font)
        textItemRef.font = topts.font;

    if (topts.direction)
        textItemRef.direction = topts.direction;

    textItemRef.position = Array(UnitValue(xPx, "px"), UnitValue(yPx, "px"));

    if (topts.lgroup)
        artLayerRef.move(topts.lgroup, ElementPlacement.PLACEATBEGINNING);

    if ((topts.lending) && (topts.lending != 0)) {
        textItemRef.useAutoLeading = true;
        textItemRef.autoLeadingAmount = topts.lending;
    }

    if (topts.color) {
        textItemRef.color = topts.color;
    }

    if (topts.antiAlias !== undefined && topts.antiAlias !== 0) {
        /// @ts-ignore
        let aaMap = [undefined, AntiAlias.NONE, AntiAlias.SHARP, AntiAlias.CRISP, AntiAlias.STRONG, AntiAlias.SMOOTH];
        /// @ts-ignore
        textItemRef.antiAliasMethod = aaMap[topts.antiAlias];
    }

    if (topts.autoKerningMetrics) {
        textItemRef.autoKerning = AutoKernType.METRICS;
    }

    artLayerRef.name     = text;
    textItemRef.contents = text;

    return artLayerRef;
}

// 创建带样式的文本图层（性能优化）：
// 同一分组的首个标签走完整创建（逐项设置文字属性），后续标签直接复制首个图层，
// 只更新位置/名称/内容——把每标签约 14 次 PS 属性设置往返降到 4 次
function createStyledTextLayer(img: ImageDocInfo, group: string, contents: string,
                               xPx: number, yPx: number, o: TextInputOptions): ArtLayer
{
    let proto = img.ws.layerPrototypes[group];
    if (proto !== undefined) {
        let lgroup = img.ws.groups[group].layerSet;
        let layer: ArtLayer;
        if (lgroup !== undefined) {
            /// @ts-ignore ts声明文件有误，duplicate()返回ArtLayer对象，而不是void
            layer = <ArtLayer> proto.duplicate(lgroup, ElementPlacement.PLACEATBEGINNING);
        } else {
            /// @ts-ignore ts声明文件有误，duplicate()返回ArtLayer对象，而不是void
            layer = <ArtLayer> proto.duplicate();
        }
        layer.textItem.position = Array(UnitValue(xPx, "px"), UnitValue(yPx, "px"));
        layer.name = contents;
        layer.textItem.contents = contents;
        // 直排内横排 / 比例间距（逐标签，按文本内容计算命中区间）
        applyLabelTypography(img.ws.doc, layer, contents);
        return layer;
    }
    let layer = newTextLayer(img.ws.doc, contents, xPx, yPx, o);
    img.ws.layerPrototypes[group] = layer;
    // 标准垂直罗马对齐：脚本端直接设置（原型层设置一次，克隆层自动继承）
    // 若所用模板已自带该属性（_roman），则跳过，避免多余的底层写入
    if (opts !== null && opts.verticalRoman && !templateHasVerticalRoman) {
        applyVerticalRomanAlignment(img.ws.doc, layer);
    }
    // 直排内横排 / 比例间距（逐标签，按文本内容计算命中区间）
    applyLabelTypography(img.ws.doc, layer, contents);
    return layer;
}

// ==================== 文字样式覆写引擎 ====================
// 移植自 ZsIsMe/PS-Script (by zhongsheng，感谢原作者)：
// 通过 ActionManager 读取图层的 textKey 描述符，重建 textStyleRange 后写回，
// 用于脚本端设置“标准垂直罗马对齐”(baselineDirection=withStream)、
// “直排内横排”(baselineDirection=Crs)、“比例间距”(mojiZume) 等字符级属性。

interface StyleOverrideRange {
    from: number;
    to: number;
    mutators: Array<(s: ActionDescriptor) => void>;
}

// 深拷贝 ActionDescriptor（优先 stream 克隆；旧版 PS 不支持时回退为逐项复制）
function cloneActionDescriptor(src: ActionDescriptor): ActionDescriptor {
    try {
        /// @ts-ignore ActionDescriptor 的 stream 接口未在类型声明中
        let stream = src.toStream();
        let cloned = new ActionDescriptor();
        /// @ts-ignore
        cloned.fromStream(stream);
        return cloned;
    } catch (e) {
        // 回退：逐项复制
    }
    let dst = new ActionDescriptor();
    for (let i = 0; i < src.count; i++) {
        let key = src.getKey(i);
        let type = src.getType(key);
        switch (type) {
        case DescValueType.BOOLEANTYPE:
            dst.putBoolean(key, src.getBoolean(key)); break;
        case DescValueType.STRINGTYPE:
            dst.putString(key, src.getString(key)); break;
        case DescValueType.INTEGERTYPE:
            dst.putInteger(key, src.getInteger(key)); break;
        case DescValueType.DOUBLETYPE:
            dst.putDouble(key, src.getDouble(key)); break;
        case DescValueType.UNITDOUBLE:
            dst.putUnitDouble(key, src.getUnitDoubleType(key), src.getUnitDoubleValue(key)); break;
        case DescValueType.ENUMERATEDTYPE:
            dst.putEnumerated(key, src.getEnumerationType(key), src.getEnumerationValue(key)); break;
        case DescValueType.OBJECTTYPE:
            dst.putObject(key, src.getObjectType(key), cloneActionDescriptor(src.getObjectValue(key))); break;
        case DescValueType.LISTTYPE:
            dst.putList(key, cloneActionList(src.getList(key))); break;
        case DescValueType.REFERENCETYPE:
            dst.putReference(key, src.getReference(key)); break;
        case DescValueType.CLASSTYPE:
            dst.putClass(key, src.getClass(key)); break;
        case DescValueType.RAWTYPE:
            dst.putData(key, src.getData(key)); break;
        case DescValueType.ALIASTYPE:
            dst.putPath(key, src.getPath(key)); break;
        }
    }
    return dst;
}

function cloneActionList(src: ActionList): ActionList {
    let dst = new ActionList();
    for (let i = 0; i < src.count; i++) {
        if (src.getType(i) === DescValueType.OBJECTTYPE) {
            /// @ts-ignore 运行时 ActionList.putObject 支持 (classID, value)
            dst.putObject(src.getObjectType(i), cloneActionDescriptor(src.getObjectValue(i)));
        }
    }
    return dst;
}

function splitStylePatterns(patterns: string): string[] {
    let arr: string[] = [];
    if (!patterns) return arr;
    let parts = patterns.split("|");
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== "") arr.push(parts[i]);
    }
    arr.sort((a, b) => b.length - a.length); // 长片段优先匹配
    return arr;
}

function isRangeCovered(covered: boolean[], from: number, to: number): boolean {
    for (let i = from; i < to; i++) {
        if (covered[i]) return true;
    }
    return false;
}

function markRangeCovered(covered: boolean[], from: number, to: number): void {
    for (let i = from; i < to; i++) covered[i] = true;
}

// 收集命中区间：片段规则优先（保留完整区间），再收集未被覆盖的字符规则
function collectStyleRanges(text: string,
        patternRules: Array<{ patterns: string; mutate: (s: ActionDescriptor) => void }>,
        charRules: Array<{ chars: string; mutate: (s: ActionDescriptor) => void }>): StyleOverrideRange[] {
    let ranges: StyleOverrideRange[] = [];
    let covered: boolean[] = [];
    for (let i = 0; i < text.length; i++) covered[i] = false;

    for (let r = 0; r < patternRules.length; r++) {
        let patterns = splitStylePatterns(patternRules[r].patterns);
        let i = 0;
        while (i < text.length) {
            let matched = "";
            for (let p = 0; p < patterns.length; p++) {
                let pattern = patterns[p];
                if (pattern.length > 0 && text.substr(i, pattern.length) === pattern &&
                        !isRangeCovered(covered, i, i + pattern.length)) {
                    matched = pattern;
                    break;
                }
            }
            if (matched !== "") {
                ranges.push({ from: i, to: i + matched.length, mutators: [patternRules[r].mutate] });
                markRangeCovered(covered, i, i + matched.length);
                i += matched.length;
            } else {
                i++;
            }
        }
    }

    for (let i = 0; i < text.length; i++) {
        if (covered[i]) continue;
        let ch = text.charAt(i);
        let muts: Array<(s: ActionDescriptor) => void> = [];
        for (let r = 0; r < charRules.length; r++) {
            if (charRules[r].chars.indexOf(ch) !== -1) {
                muts.push(charRules[r].mutate);
            }
        }
        if (muts.length > 0) {
            ranges.push({ from: i, to: i + 1, mutators: muts });
        }
    }
    ranges.sort((a, b) => a.from - b.from);
    return ranges;
}

// 读取当前活动图层的 textKey 描述符
function readActiveLayerTextKey(): ActionDescriptor | null {
    let getRef = new ActionReference();
    getRef.putProperty(app.charIDToTypeID("Prpr"), app.stringIDToTypeID("textKey"));
    getRef.putEnumerated(app.charIDToTypeID("Lyr "), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"));
    let layerDesc = app.executeActionGet(getRef);
    if (!layerDesc.getObjectValue) return null;
    return layerDesc.getObjectValue(app.stringIDToTypeID("textKey"));
}

// 把修改后的 textKey 写回当前活动图层（textLayer 的 class ID 为 'TxLr'）
function writeActiveLayerTextKey(textKey: ActionDescriptor): void {
    let setRef = new ActionReference();
    setRef.putEnumerated(app.charIDToTypeID("Lyr "), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"));
    let setDesc = new ActionDescriptor();
    setDesc.putReference(app.charIDToTypeID("null"), setRef);
    setDesc.putObject(app.charIDToTypeID("T   "), app.charIDToTypeID("TxLr"), textKey);
    app.executeAction(app.charIDToTypeID("setd"), setDesc, DialogModes.NO);
}

// 对整段文字应用样式修改（所有 textStyleRange 的样式统一 mutate）
function applyWholeTextStyleMutation(doc: Document, layer: ArtLayer, mutate: (s: ActionDescriptor) => void): void {
    try {
        doc.activeLayer = layer;
        let textKey = readActiveLayerTextKey();
        if (textKey === null) return;
        let oldRanges = textKey.getList(app.stringIDToTypeID("textStyleRange"));
        if (oldRanges.count === 0) return;

        let newRanges = new ActionList();
        for (let i = 0; i < oldRanges.count; i++) {
            let oldRange = oldRanges.getObjectValue(i);
            let style = cloneActionDescriptor(oldRange.getObjectValue(app.stringIDToTypeID("textStyle")));
            mutate(style);
            let r = new ActionDescriptor();
            r.putInteger(app.stringIDToTypeID("from"), oldRange.getInteger(app.stringIDToTypeID("from")));
            r.putInteger(app.stringIDToTypeID("to"), oldRange.getInteger(app.stringIDToTypeID("to")));
            r.putObject(app.stringIDToTypeID("textStyle"), app.stringIDToTypeID("textStyle"), style);
            /// @ts-ignore 运行时 ActionList.putObject 支持 (classID, value)
            newRanges.putObject(app.stringIDToTypeID("textStyleRange"), r);
        }
        textKey.putList(app.stringIDToTypeID("textStyleRange"), newRanges);
        writeActiveLayerTextKey(textKey);
    } catch (e) {
        log_err("applyWholeTextStyleMutation failed: " + e);
    }
}

// 按命中区间应用字符/片段级样式覆写（重建 textStyleRange 后写回）
function applyRangeStyleOverrides(doc: Document, layer: ArtLayer, ranges: StyleOverrideRange[]): void {
    if (ranges.length === 0) return;
    try {
        doc.activeLayer = layer;
        let textKey = readActiveLayerTextKey();
        if (textKey === null) return;
        let sTID = (s: string) => app.stringIDToTypeID(s);
        let oldRanges = textKey.getList(sTID("textStyleRange"));
        if (oldRanges.count === 0) return;

        let buildRange = (from: number, to: number, baseStyle: ActionDescriptor,
                          mutators: Array<(s: ActionDescriptor) => void>): ActionDescriptor => {
            let r = new ActionDescriptor();
            r.putInteger(sTID("from"), from);
            r.putInteger(sTID("to"), to);
            let style = cloneActionDescriptor(baseStyle);
            for (let i = 0; i < mutators.length; i++) {
                mutators[i](style);
            }
            r.putObject(sTID("textStyle"), sTID("textStyle"), style);
            return r;
        };

        let newRanges = new ActionList();
        for (let oi = 0; oi < oldRanges.count; oi++) {
            let oldRange = oldRanges.getObjectValue(oi);
            let from = oldRange.getInteger(sTID("from"));
            let to = oldRange.getInteger(sTID("to"));
            let baseStyle = oldRange.getObjectValue(sTID("textStyle"));
            let cursor = from;

            for (let ri = 0; ri < ranges.length; ri++) {
                let range = ranges[ri];
                if (range.to <= from) continue;
                if (range.from >= to) break;

                let overlapFrom = Math.max(range.from, cursor);
                let overlapTo = Math.min(range.to, to);
                if (overlapTo <= overlapFrom) continue;

                if (cursor < overlapFrom) {
                    /// @ts-ignore 运行时 ActionList.putObject 支持 (classID, value)
                    newRanges.putObject(sTID("textStyleRange"), buildRange(cursor, overlapFrom, baseStyle, []));
                }
                /// @ts-ignore 运行时 ActionList.putObject 支持 (classID, value)
                newRanges.putObject(sTID("textStyleRange"), buildRange(overlapFrom, overlapTo, baseStyle, range.mutators));
                cursor = overlapTo;
            }

            if (cursor < to) {
                /// @ts-ignore 运行时 ActionList.putObject 支持 (classID, value)
                newRanges.putObject(sTID("textStyleRange"), buildRange(cursor, to, baseStyle, []));
            }
        }
        textKey.putList(sTID("textStyleRange"), newRanges);
        writeActiveLayerTextKey(textKey);
    } catch (e) {
        log_err("applyRangeStyleOverrides failed: " + e);
    }
}

// 脚本端设置“标准垂直罗马对齐”（baselineDirection=withStream），不再依赖 _roman 模板
function applyVerticalRomanAlignment(doc: Document, layer: ArtLayer): void {
    try {
        if (layer.textItem.direction !== Direction.VERTICAL) {
            return; // 横排无需设置
        }
        applyWholeTextStyleMutation(doc, layer, (style) => {
            let id = app.stringIDToTypeID("baselineDirection");
            style.putEnumerated(id, id, app.stringIDToTypeID("withStream"));
        });
        log("standard vertical roman alignment applied (script-side)");
    } catch (e) {
        log_err("applyVerticalRomanAlignment failed: " + e);
    }
}

// 直排内横排 + 比例间距：按标签文本计算命中区间并应用
function applyLabelTypography(doc: Document, layer: ArtLayer, contents: string): void {
    assert(opts !== null);
    try {
        let patternRules: Array<{ patterns: string; mutate: (s: ActionDescriptor) => void }> = [];
        let charRules: Array<{ chars: string; mutate: (s: ActionDescriptor) => void }> = [];

        if (opts.tateChuYokoPatterns !== "" && layer.textItem.direction === Direction.VERTICAL) {
            patternRules.push({
                patterns: opts.tateChuYokoPatterns,
                mutate: (style) => {
                    let id = app.stringIDToTypeID("baselineDirection");
                    style.putEnumerated(id, id, app.charIDToTypeID("Crs "));
                }
            });
        }
        if (opts.verticalRomanChars !== "" && layer.textItem.direction === Direction.VERTICAL) {
            charRules.push({
                chars: opts.verticalRomanChars,
                mutate: (style) => {
                    let id = app.stringIDToTypeID("baselineDirection");
                    style.putEnumerated(id, id, app.stringIDToTypeID("withStream"));
                }
            });
        }
        if (opts.tsumeChars !== "" && opts.tsumePercent > 0) {
            let tsumeValue = opts.tsumePercent / 100;
            charRules.push({
                chars: opts.tsumeChars,
                mutate: (style) => {
                    style.putDouble(app.stringIDToTypeID("mojiZume"), tsumeValue);
                }
            });
        }
        if (patternRules.length === 0 && charRules.length === 0) return;

        let ranges = collectStyleRanges(contents, patternRules, charRules);
        if (ranges.length > 0) {
            applyRangeStyleOverrides(doc, layer, ranges);
        }
    } catch (e) {
        log_err("applyLabelTypography failed: " + e);
    }
}

type TextReplaceInfo = { from: string; to: string; }[];

// 文本替换表达式解析
function textReplaceReader(str: string): TextReplaceInfo | null
{
    let arr: TextReplaceInfo = [];

    let strs = str.split('|');
    if (!strs)
        return null; //解析失败

    for (let i = 0; i < strs.length; i++) {
        if (strs[i] === "")
            continue;

        let strss = strs[i].split("->");
        if ((strss.length != 2) || (strss[0] == ""))
            return null; //解析失败

        arr.push({ from: strss[0], to: strss[1] });
    }
    return arr;
}

// 单条 "A->B" 规则解析（宽松：非法则跳过该条，不整体失败）
function pushReplaceRule(expr: string, out: TextReplaceInfo): void {
    let strss = expr.split("->");
    if ((strss.length != 2) || (strss[0] == ""))
        return;
    out.push({ from: strss[0], to: strss[1] });
}

// 去掉 YAML 标量的成对引号
function stripYamlQuotes(s: string): string {
    if (s.length >= 2) {
        let a = s.charAt(0);
        let b = s.charAt(s.length - 1);
        if ((a === "\"" && b === "\"") || (a === "'" && b === "'")) {
            return s.substring(1, s.length - 1);
        }
    }
    return s;
}

// 从规则文件读取替换规则：.txt（每行 A->B，也允许 | 分隔）/ .yml、.yaml（"源: 替换" 映射行或 "- A->B" 列表项，# 注释）。
// 文件不存在/打不开返回 null；单行非法则跳过（宽松）。
function textReplaceReaderFromFile(path: string): TextReplaceInfo | null {
    let f = new File(path);
    if (!f.exists || !f.open("r", "TEXT", "????")) {
        return null;
    }
    f.lineFeed = "unix";
    f.encoding = "UTF-8";
    let text = "";
    try {
        text = f.read();
    } finally {
        try { f.close(); } catch (e) { }
    }
    text = text.replace(/^\uFEFF/, "");
    let isYaml = /\.ya?ml$/i.test(path);
    let out: TextReplaceInfo = [];
    let lines = text.split(/\r\n|\n|\r/);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line === "" || line.charAt(0) === "#") {
            continue;
        }
        if (isYaml) {
            // 行内注释：YAML 规则为 " #"（# 前有空白）起截断；无空白的 # 视为普通字符
            let hi = line.indexOf(" #");
            if (hi >= 0) {
                line = line.substring(0, hi).trim();
                if (line === "") {
                    continue;
                }
            }
            if (line.charAt(0) === "-") {
                // 列表项 "- A->B"
                pushReplaceRule(stripYamlQuotes(line.substring(1).trim()), out);
                continue;
            }
            // 映射行 "源: 替换"（取第一个冒号；值为空的行如 "rules:" 自动跳过）
            let ci = line.indexOf(":");
            if (ci <= 0) {
                continue;
            }
            let key = stripYamlQuotes(line.substring(0, ci).trim());
            let val = stripYamlQuotes(line.substring(ci + 1).trim());
            if (key !== "" && val !== "") {
                out.push({ from: key, to: val });
            }
            continue;
        }
        // txt：每行 A->B，也允许 | 分隔
        let parts = line.split("|");
        for (let k = 0; k < parts.length; k++) {
            if (parts[k] !== "") {
                pushReplaceRule(parts[k], out);
            }
        }
    }
    return out;
}

} // namespace LabelPlus
