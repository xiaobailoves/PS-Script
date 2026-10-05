//todo: 以下标记可能被typescript过滤掉，需要找个更妥当的办法导入js
//@include "./xtools/xlib/GenericUI.jsx";
//@include "./xtools/xlib/LogWindow.js";
//@include  "my_action.js"
//@include "./jam/jamJSON.jsxinc"

/// <reference path="legacy.d.ts" />
/// <reference path="i18n.ts" />
/// <reference path="version.ts" />
/// <reference path="custom_options.ts" />
/// <reference path="importer.ts" />
/// <reference path="text_parser.ts" />
/// <reference path="common.ts" />

namespace LabelPlus {

interface CustomOptionsPicker { (opts: CustomOptions, toFile: boolean): CustomOptions | null };
interface PanelDesc {
    x?: number,
    y?: number,
    getOption?: CustomOptionsPicker,
}

class LabelPlusInput extends GenericUI {
    private opts: CustomOptions;
    private lpFile: LpFile | null = null;

    private inputPnl: any;
    private outputPnl: any;
    private stylePnl: any;
    private automationPnl: any;

    constructor() {
        super();
        this.saveIni = false;
        this.hasBorder = false;
        this.settingsPanel = false;
        this.winRect = { x: 200, y: 200, w: 880, h: 660 };
        this.center = true;
        this.title = I18n.APP_NAME + " " + VERSION;
        this.notesSize = 0;
        this.processTxt = I18n.BUTTON_RUN;
        this.cancelTxt = I18n.BUTTON_CANCEL;

        try {
            this.opts = readIni(DEFAULT_INI_PATH); // try to load auto saved ini
            log("read option from " + DEFAULT_INI_PATH + "OK");
        } catch {
            this.opts = new CustomOptions();
            log("read option from " + DEFAULT_INI_PATH + "failed");
        }
    }

    private getMatchedFileList = () => {
        let pnl = this.inputPnl;
        let selectedList = getSelectedItemsText(pnl.chooseImageListBox);
        let fileList = getImageFilesListOfPath(pnl.sourceTextBox.text);
        let replaceImgSuffix = (pnl.replaceImgSuffixCheckBox.value) ? pnl.replaceImgSuffixTextbox.text : "";
        let matchImgByOrder = pnl.matchImgByOrderCheckBox.value;
        let arr: ImageInfo[] = [];
        for (let i = 0; i < selectedList.length; i++) {
            let filename  = selectedList[i].text;
            let fileindex = selectedList[i].index;
            if (matchImgByOrder) {
                arr.push({
                    file: filename,
                    matched_file: (fileList.length > fileindex) ? fileList[fileindex] : "",
                    index: fileindex
                });
            }
            else if (replaceImgSuffix !== "") {
                arr.push({
                    file: filename,
                    matched_file: filename.substring(0, filename.lastIndexOf(".")) + replaceImgSuffix,
                    index: fileindex
                });
            }
            else {
                arr.push({
                    file: filename,
                    matched_file: filename,
                    index: fileindex
                });
            }
        }
        return arr;
    }

    private optPickers: CustomOptionsPicker[] = [];
    private addToPickerList = (picker?: CustomOptionsPicker) => {
        if (picker)
            this.optPickers[this.optPickers.length] = picker;
    }

    private uiLpTextSelect = (pnl: any): PanelDesc => {
        let xx: number = 46, yy: number = 11;
        pnl.lpTextFileLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_TEXT_FILE);
        xx += 120;
        pnl.lpTextFileTextBox = pnl.add('edittext', [xx, yy, xx + 234, yy + 20], '');
        pnl.lpTextFileTextBox.enabled = false;
        xx += 234;
        pnl.lpTextFileBrowseButton = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        xx += 30;
        yy += 20;
        pnl.lpTextFileBrowseButton.onClick = () => {
            let inputPnl = this.inputPnl;
            let outputPnl = this.outputPnl;
            let automationPnl = this.automationPnl;

            let fmask = "*.txt;*.json";
            let f = File.openDialog(I18n.LABEL_TEXT_FILE, fmask);
            if (f && f.exists) {
                pnl.lpTextFileTextBox.text = f.fsName;
                let fl = new Folder(f.path);
                inputPnl.sourceTextBox.text = fl.fsName;
                outputPnl.targetTextBox.text = fl.fsName + dirSeparator + 'output';

                // detect images source sub dir
                let src_subdirs = ["images", "image", "img", "source", "图源"];
                for (let subdir of src_subdirs) {
                    let dir_path = fl.fsName + dirSeparator + subdir;
                    if (FolderIsExists(dir_path)) {
                        log("dectect images source: " + dir_path);
                        inputPnl.sourceTextBox.text = dir_path;
                        break;
                    }
                }
            } else {
                return {};        // cancel by user
            }

            // load lptext file
            let lpFile = lpTextParser(f.fsName);
            if (lpFile === null) {
                alert(I18n.ERROR_PARSER_LPTEXT_FAIL);
                return {};
            }
            this.lpFile = lpFile;
            this.allPanelEnable(true);

            // fill ui elements
            inputPnl.chooseImageListBox.removeAll();
            inputPnl.chooseGroupListBox.removeAll();
            // reset dialog-overlay group dropdown for the new file (keep the empty item)
            automationPnl.overlayPnl.addGroupList.removeAll();
            automationPnl.overlayPnl.addGroupList.add('item', "");
            for (let key in lpFile.images) {
                let item = inputPnl.chooseImageListBox.add('item', key);
                item.selected = true;
            }
            for (let i = 0; i < lpFile.groups.length; i++) {
                let g = lpFile.groups[i];
                let groupItem = inputPnl.chooseGroupListBox.add('item', g, i);
                groupItem.selected = true;

                // dialog overlay
                {
                    let doPnl = automationPnl.overlayPnl;
                    if (doPnl.groupTextBox.text == "") { // first group
                        doPnl.groupTextBox.text = g;
                    }
                    doPnl.addGroupList.add('item', g, i);
                }
            }
            return {};
        };

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // labeplus text file
                let f = new File(pnl.lpTextFileTextBox.text);
                if (!f || !f.exists) {
                    alert(I18n.ERROR_NOT_FOUND_LPTEXT);
                    return null;
                }
                let lpFile = lpTextParser(pnl.lpTextFileTextBox.text);
                if (lpFile === null) {
                    alert(I18n.ERROR_PARSER_LPTEXT_FAIL);
                    return null;
                }
                opts.lpTextFilePath = pnl.lpTextFileTextBox.text;
            }

            return opts;
        }

        return {x: xx, y:yy, getOption: getOption};
    }

    private uiInputPanel = (pnl: any): PanelDesc => {
        let xOfs = 16, yOfs = 16;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_INPUT;

        // image source folder select
        pnl.sourceLabel = pnl.add('statictext', [xx, yy, xx + 80, yy + 20], I18n.LABEL_SOURCE);
        xx += 90;
        pnl.sourceTextBox = pnl.add('edittext', [xx, yy, xx + 652, yy + 20], '');
        xx += 662;
        pnl.sourceBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.sourceBrowse.onClick = () => {
            try {
                let def :string = (pnl.sourceTextBox.text ?
                    pnl.sourceTextBox.text : Folder.desktop);
                let f = Stdlib.selectFolder(I18n.LABEL_SOURCE, def);
                if (f) {
                    pnl.sourceTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 28;

        // match image file by order
        pnl.matchImgByOrderCheckBox = pnl.add('checkbox', [xx, yy, xx + 220, yy + 20], I18n.CHECKBOX_MATCH_IMG_BY_ORDER);
        pnl.matchImgByOrderCheckBox.onClick = () => {
            if (pnl.matchImgByOrderCheckBox.value) {
                pnl.replaceImgSuffixCheckBox.value = false; // incompatible to "replace image suffix"
                Emit(pnl.replaceImgSuffixCheckBox.onClick);
            }
        }
        xx += 225;
        pnl.checkSourceMatchButton = pnl.add('button', [xx, yy - 2, xx + 140, yy + 20], I18n.BUTTON_SOURCE_CHECK_MATCH);
        pnl.checkSourceMatchButton.onClick = () => { // preview button
            let matchList = this.getMatchedFileList();
            var logwin = new LogWindow(I18n.BUTTON_SOURCE_CHECK_MATCH);
            for (let i = 0; i < matchList.length; i++) {
                if (matchList[i].matched_file == "") {
                    logwin.append(matchList[i].file + " -> " + I18n.ERROR_NO_MATCH_IMG);
                }
                else {
                    let found = FileIsExists(pnl.sourceTextBox.text + dirSeparator + matchList[i].matched_file);
                    logwin.append(matchList[i].file + "(" + matchList[i].matched_file + ")" + " -> " + (found ? "OK" : I18n.ERROR_NO_MATCH_IMG));
                }
            }
            logwin.show();
        }
        xx = xOfs;
        yy += 28;

        // replace image suffix
        pnl.replaceImgSuffixCheckBox = pnl.add('checkbox', [xx, yy, xx + 220, yy + 20], I18n.CHECKBOX_REPLACE_IMG_SUFFIX);
        pnl.replaceImgSuffixCheckBox.onClick = () => {
            if (pnl.replaceImgSuffixCheckBox.value) {
                pnl.matchImgByOrderCheckBox.value = false; // incompatible to "match image file by order"
                Emit(pnl.matchImgByOrderCheckBox.onClick);
            }
            let enable = pnl.replaceImgSuffixCheckBox.value;
            pnl.replaceImgSuffixTextbox.enabled = enable;
            pnl.setSourceFileTypeList.enabled = enable;
        }
        xx += 225;
        pnl.replaceImgSuffixTextbox = pnl.add('edittext', [xx, yy, xx + 160, yy + 20]);
        xx += 165;
        let type_list = [""];
        type_list = type_list.concat(image_suffix_list);
        pnl.setSourceFileTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 55, yy + 21], type_list);
        let func = () => {
            pnl.replaceImgSuffixTextbox.text = pnl.setSourceFileTypeList.selection.text;
            pnl.setSourceFileTypeList.onChange = undefined;
            pnl.setSourceFileTypeList.selection = pnl.setSourceFileTypeList.find("");
            pnl.setSourceFileTypeList.onChange = func;
        }
        pnl.setSourceFileTypeList.onChange = func;
        xx = xOfs;
        yy += 28;

        // overlay manual folder (涂白文件夹，可选)
        pnl.overlayManualLabel = pnl.add('statictext', [xx, yy, xx + 80, yy + 20], I18n.LABEL_OVERLAY_MANUAL);
        xx += 90;
        pnl.overlayManualTextBox = pnl.add('edittext', [xx, yy, xx + 652, yy + 20], '');
        xx += 662;
        pnl.overlayManualBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.overlayManualBrowse.onClick = () => {
            try {
                let def: string = (pnl.overlayManualTextBox.text ?
                    pnl.overlayManualTextBox.text : (pnl.sourceTextBox.text ? pnl.sourceTextBox.text : Folder.desktop));
                let f = Stdlib.selectFolder(I18n.LABEL_OVERLAY_MANUAL, def);
                if (f) {
                    pnl.overlayManualTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 28;

        // selct img
        yOfs = yy;
        pnl.chooseImageLabel = pnl.add('statictext', [xx, yy, xx + 180, yy + 20], I18n.LABEL_SELECT_IMG);
        yy += 25;
        pnl.chooseImageListBox = pnl.add('listbox', [xx, yy, xx + 380, yy + 270], [], { multiselect: true });

        // select label group
        yy = yOfs;
        xx = xOfs + 402;
        pnl.chooseGroupLabel = pnl.add('statictext', [xx, yy, xx + 180, yy + 20], I18n.LABEL_SELECT_GROUP);
        yy += 25;
        pnl.chooseGroupListBox = pnl.add('listbox', [xx, yy, xx + 380, yy + 270], [], { multiselect: true });
        xx = xOfs;
        yy += 278;

        // tip for multiple selection
        let tipText = pnl.add('statictext', [xx, yy, xx + 624, yy + 44], I18n.LABEL_SELECT_TIP, { multiline: true });
        styleDim(tipText);

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // image source folder
                let f = new Folder(pnl.sourceTextBox.text);
                if (!f || !f.exists) {
                    alert(I18n.ERROR_NOT_FOUND_SOURCE);
                    return null;
                }
                opts.source = f.fsName;

                // overlay manual folder (optional)
                if (pnl.overlayManualTextBox.text !== "") {
                    let ov = new Folder(pnl.overlayManualTextBox.text);
                    if (!ov.exists) {
                        alert(I18n.ERROR_NOT_FOUND_OVERLAY);
                        return null;
                    }
                    opts.overlayManualSource = ov.fsName;
                } else {
                    opts.overlayManualSource = "";
                }

                // images select
                if (!pnl.chooseImageListBox.selection || pnl.chooseImageListBox.selection.length == 0) {
                    alert(I18n.ERROR_NO_IMG_CHOOSED);
                    return null;
                }
                opts.imageSelected = this.getMatchedFileList();

                // label groups
                if (!pnl.chooseGroupListBox.selection || pnl.chooseGroupListBox.selection.length == 0) {
                    alert(I18n.ERROR_NO_LABEL_GROUP_CHOOSED);
                    return null;
                }
                opts.groupSelected = [];
                for (let i = 0; i < pnl.chooseGroupListBox.selection.length; i++) {
                    opts.groupSelected[i] = pnl.chooseGroupListBox.selection[i].text;
                }
            }
            return opts;
        }

        return {x: xx, y:yy, getOption: getOption };
    }

    private uiOutputPanel = (pnl: any): PanelDesc => {
        let xOfs = 95, yOfs = 160;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_OUTPUT;

        // output folder
        pnl.targetLabel = pnl.add('statictext', [xx, yy, xx + 130, yy + 20], I18n.LABEL_TARGET);
        xx += 140;
        pnl.targetTextBox = pnl.add('edittext', [xx, yy, xx + 446, yy + 20], '');
        xx += 454;
        pnl.targetBrowse = pnl.add('button', [xx, yy - 2, xx + 30, yy + 20], '...');
        pnl.targetBrowse.onClick = () => {
            try {
                let f;
                let def = pnl.targetTextBox.text;
                if (!def) {
                    if (pnl.sourceTextBox.text) {
                        def = pnl.sourceTextBox.text;
                    } else {
                        def = Folder.desktop;
                    }
                }
                f = Stdlib.selectFolder(I18n.LABEL_TARGET, def);

                if (f) {
                    pnl.targetTextBox.text = f.fsName;
                }
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 36;

        // output file type
        pnl.outputTypeLabel = pnl.add('statictext', [xx, yy, xx + 130, yy + 20], I18n.LABEL_OUTPUT_FILE_TYPE);
        let type_arr: string[] = [];
        for (let i = 0; i < OptionOutputType._count; i++) {
            type_arr[i] = OptionOutputType[i];
        }
        xx += 140;
        pnl.outputTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 100, yy + 21], type_arr);
        xx = xOfs;
        yy += 36;

        // ignore images with no label
        pnl.ignoreNoLabelImgCheckBox = pnl.add('checkbox', [235, yy, 455, yy + 20], I18n.CHECKBOX_IGNORE_NO_LABEL_IMG);
        pnl.ignoreNoLabelImgCheckBox.value = true;

        // do not close image document after importing complete
        pnl.notCloseCheckBox = pnl.add('checkbox', [485, yy, 705, yy + 20], I18n.CHECKBOX_NOT_CLOSE);
        yy += 36;

        // output label index as text layer
        pnl.outputLabelIndexCheckBox = pnl.add('checkbox', [235, yy, 455, yy + 20], I18n.CHECKBOX_OUTPUT_LABEL_INDEX);

        // do not create layer group
        pnl.noLayerGroupCheckBox = pnl.add('checkbox', [485, yy, 705, yy + 20], I18n.CHECKBOX_NO_LAYER_GROUP);
        yy += 36;

        // ppi
        pnl.setPPICheckBox = pnl.add('checkbox', [235, yy, 335, yy + 20], I18n.CHECKBOX_SET_PPI);
        pnl.setPPICheckBox.onClick = () => {
            pnl.ppiTextBox.enabled = pnl.setPPICheckBox.value;
        }
        pnl.ppiTextBox = pnl.add('edittext', [340, yy, 390, yy + 20]);
        pnl.ppiTextBox.enabled = false;
        pnl.ppiTextBox.text = "300";
        xx = xOfs;
        yy += 36;

        let opts = this.opts;
        if (opts.outputLabelIndex !== undefined) {
            pnl.outputLabelIndexCheckBox.value = opts.outputLabelIndex;
            Emit(pnl.outputLabelIndexCheckBox.onClick);
        }
        if (opts.ignoreNoLabelImg !== undefined) {
            pnl.ignoreNoLabelImgCheckBox.value = opts.ignoreNoLabelImg;
            Emit(pnl.ignoreNoLabelImgCheckBox.onClick);
        }
        if (opts.outputType !== undefined) {
            let typeName = OptionOutputType[opts.outputType];
            if (typeName !== undefined) {
                let item = pnl.outputTypeList.find(typeName);
                if (item !== null) {
                    pnl.outputTypeList.selection = item;
                }
            }
        }
        if (opts.notClose !== undefined) {
            pnl.notCloseCheckBox.value = opts.notClose;
            Emit(pnl.notCloseCheckBox.onClick);
        }
        if (opts.noLayerGroup !== undefined) {
            pnl.noLayerGroupCheckBox.value = opts.noLayerGroup;
            Emit(pnl.noLayerGroupCheckBox.onClick);
        }
        if (opts.ppi !== undefined && opts.ppi !== 0) {
            pnl.setPPICheckBox.value = true;
            pnl.ppiTextBox.text = opts.ppi.toString();
            Emit(pnl.setPPICheckBox.onClick);
        }

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // image target folder
                let f = new Folder(pnl.targetTextBox.text);
                if (!f.exists) {
                    if (!f.create()) {
                        alert(I18n.ERROR_CREATE_NEW_FOLDER);
                        return null;
                    }
                }
                opts.target = f.fsName;
            }
            opts.outputType = <number>pnl.outputTypeList.selection.index;
            opts.outputLabelIndex = pnl.outputLabelIndexCheckBox.value;
            opts.ignoreNoLabelImg = pnl.ignoreNoLabelImgCheckBox.value;
            opts.notClose = pnl.notCloseCheckBox.value;
            opts.noLayerGroup = pnl.noLayerGroupCheckBox.value;
            opts.ppi = (pnl.setPPICheckBox.value) ? Number(pnl.ppiTextBox.text) : 0;
            return opts;
        }

        return {getOption: getOption};
    }

    private uiStylePanel = (pnl: any): PanelDesc => {
        let xOfs = 16, yOfs = 98;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_STYLE;

        // template settings
        pnl.docTemplatePnl = pnl.add('panel', [xx, yy, xx + 782, yy + 106], I18n.PANEL_TEMPLATE_SETTING);
        stylePanelTint(pnl.docTemplatePnl);

        let pnll: any = pnl.docTemplatePnl;
        let xxxOfs: number = 16;
        let xxx: number = xxxOfs;
        let yyy: number = 10;
        pnll.autoTemplateRb = pnll.add('radiobutton',  [xxx, yyy, xxx + 200, yyy + 20], I18n.RB_TEMPLATE_AUTO); xxx += 220;
        pnll.autoTemplateRb.value = true;
        pnll.noTemplateRb = pnll.add('radiobutton',  [xxx, yyy, xxx + 200, yyy + 20], I18n.RB_TEMPLATE_NO); xxx += 220;
        xxx = xxxOfs;
        yyy += 30;
        pnll.customTemplateRb = pnll.add('radiobutton', [xxx, yyy, xxx + 130, yyy + 20], I18n.RB_TEMPLATE_CUSTOM); xxx += 140;
        pnll.customTemplateTextbox = pnll.add('edittext', [xxx, yyy, xxx + 330, yyy + 20]); xxx += 340;
        pnll.customTemplateTextButton = pnll.add('button', [xxx, yyy - 2, xxx + 30, yyy + 20]); xxx += 30;
        let rbclick = () => {
            let custom_enable: boolean = pnll.customTemplateRb.value;
            pnll.customTemplateTextbox.enabled = custom_enable;
            pnll.customTemplateTextButton.enabled = custom_enable;
        };
        pnll.autoTemplateRb.onClick = rbclick;
        pnll.noTemplateRb.onClick = rbclick;
        pnll.customTemplateRb.onClick = rbclick;
        rbclick();

        pnll.customTemplateTextButton.onClick = () => {
            try {
                let def: string;
                if (pnll.customTemplateTextbox.text !== "") {
                    def = pnll.customTemplateTextbox.text;
                } else if (this.inputPnl.sourceTextBox.text !== "") {
                    def = this.inputPnl.sourceTextBox.text;
                } else {
                    def = Folder.desktop.path;
                }
                let f = Stdlib.selectFileOpen(I18n.RB_TEMPLATE_CUSTOM, "*.psd;*.tif;*.tiff", def);
                if (f)
                    pnll.customTemplateTextbox.text = f.fsName;
            } catch (e) {
                alert(Stdlib.exceptionMessage(e));
            }
        };
        xx = xOfs;
        yy += 126;

        // text direction
        pnl.textDirLabel = pnl.add('statictext', [xx, yy, xx + 100, yy + 20], I18n.LABEL_TEXT_DIRECTION);
        xx += 110;
        pnl.textDirList = pnl.add('dropdownlist', [xx, yy, xx + 100, yy + 20], I18n.LIST_TEXT_DIT_ITEMS);
        pnl.textDirList.selection = pnl.textDirList.find(I18n.LIST_TEXT_DIT_ITEMS[0]);
        xx = xOfs;
        yy += 36;

        // set font
        {
            pnl.setFontCheckBox = pnl.add('checkbox', [xx, yy, xx + 100, yy + 20], I18n.CHECKBOX_SET_FONT);
            pnl.setFontCheckBox.onClick = () => {
                let value = pnl.setFontCheckBox.value;
                pnl.font.family.enabled = value;
                pnl.font.style.enabled = value;
                pnl.font.fontSize.enabled = value;
            }
            xx += 110;
            pnl.font = pnl.add('group', [xx, yy + 2, xx + 580, yy + 25]);
            this.createFontPanel(pnl.font, undefined, "", 0);
            pnl.font.family.enabled = false;
            pnl.font.style.enabled = false;
            pnl.font.fontSize.enabled = false;
            pnl.font.family.selection = pnl.font.family.find("SimSun");
            xx = xOfs;
            yy += 36;
        }

        // anti-alias (left) | text color (right)
        let colR = 416; // right column start (symmetric with left margin)
        pnl.setAntiAliasCheckBox = pnl.add('checkbox', [xx, yy, xx + 100, yy + 20], I18n.CHECKBOX_SET_ANTI_ALIAS);
        pnl.setAntiAliasCheckBox.onClick = () => {
            pnl.antiAliasList.enabled = pnl.setAntiAliasCheckBox.value;
        }
        xx += 105;
        let aaItems = ["犀利", "锐利", "浑厚", "平滑", "无"];
        pnl.antiAliasList = pnl.add('dropdownlist', [xx, yy - 1, xx + 80, yy + 21], aaItems);
        pnl.antiAliasList.enabled = false;
        pnl.antiAliasList.selection = pnl.antiAliasList.items[3]; // 默认“平滑”
        // text color on the right
        pnl.setTextColorCheckBox = pnl.add('checkbox', [colR, yy, colR + 100, yy + 20], I18n.CHECKBOX_SET_TEXT_COLOR);
        pnl.setTextColorCheckBox.onClick = () => {
            pnl.textColorTextBox.enabled = pnl.setTextColorCheckBox.value;
        }
        pnl.textColorTextBox = pnl.add('edittext', [colR + 105, yy, colR + 225, yy + 20]);
        pnl.textColorTextBox.enabled = false;
        pnl.textColorTextBox.text = "#000000";
        xx = xOfs;
        yy += 36;

        // vertical roman (left) | leading (right)
        pnl.verticalRomanCheckBox = pnl.add('checkbox', [xx, yy, xx + 230, yy + 20], I18n.CHECKBOX_VERTICAL_ROMAN);
        // leading on the right
        pnl.setTextLeadingCheckBox = pnl.add('checkbox', [colR, yy, colR + 100, yy + 20], I18n.CHECKBOX_SET_LEADING);
        pnl.setTextLeadingCheckBox.onClick = () => {
            pnl.textLeadingTextBox.enabled = pnl.setTextLeadingCheckBox.value;
        }
        let lx = colR + 105;
        pnl.textLeadingTextBox = pnl.add('edittext', [lx, yy, lx + 60, yy + 20]);
        pnl.textLeadingTextBox.enabled = false;
        pnl.textLeadingTextBox.text = "120";
        pnl.add('statictext', [lx + 65, yy, lx + 105, yy + 20], "%");
        xx = xOfs;
        yy += 36;

        // tate-chu-yoko (left) | tsume (right)
        pnl.tateChuYokoCheckBox = pnl.add('checkbox', [xx, yy, xx + 90, yy + 20], I18n.CHECKBOX_TATE_CHU_YOKO);
        pnl.tateChuYokoCheckBox.onClick = () => {
            pnl.tateChuYokoTextBox.enabled = pnl.tateChuYokoCheckBox.value;
        };
        pnl.tateChuYokoTextBox = pnl.add('edittext', [xx + 100, yy, xx + 400, yy + 20]);
        pnl.tateChuYokoTextBox.enabled = false;
        // tsume on the right
        pnl.tsumeCheckBox = pnl.add('checkbox', [colR, yy, colR + 90, yy + 20], I18n.CHECKBOX_TSUME);
        pnl.tsumeCheckBox.onClick = () => {
            let en = pnl.tsumeCheckBox.value;
            pnl.tsumeCharsTextBox.enabled = en;
            pnl.tsumePercentTextBox.enabled = en;
        };
        pnl.tsumeCharsTextBox = pnl.add('edittext', [colR + 95, yy, colR + 175, yy + 20]);
        pnl.tsumeCharsTextBox.enabled = false;
        pnl.tsumePercentTextBox = pnl.add('edittext', [colR + 180, yy, colR + 240, yy + 20]);
        pnl.tsumePercentTextBox.enabled = false;
        pnl.tsumePercentTextBox.text = "80";
        pnl.add('statictext', [colR + 245, yy, colR + 265, yy + 20], "%");
        xx = xOfs;
        yy += 36;

        let opts = this.opts;
        if (opts.docTemplate !== undefined) {
            pnl.docTemplatePnl.autoTemplateRb.value = false;
            pnl.docTemplatePnl.noTemplateRb.value = false;
            pnl.docTemplatePnl.customTemplateRb.value = false;
            switch (opts.docTemplate) {
            case OptionDocTemplate.No:
                pnl.docTemplatePnl.noTemplateRb.value = true;
                break;
            case OptionDocTemplate.Custom:
                pnl.docTemplatePnl.customTemplateRb.value = true;
                pnl.docTemplatePnl.customTemplateTextbox.text = opts.docTemplateCustomPath;
                break;
            case OptionDocTemplate.Auto:
            default:
                pnl.docTemplatePnl.autoTemplateRb.value = true;
                break;
            }
            Emit(pnl.docTemplatePnl.autoTemplateRb.onClick);
        }
        if (opts.textDirection !== undefined) {
            pnl.textDirList.selection = pnl.textDirList.find(I18n.LIST_TEXT_DIT_ITEMS[opts.textDirection]);
        }
        if (opts.font !== undefined) {
            if (opts.font === "") {
                pnl.setFontCheckBox.value = false;
            } else {
                pnl.setFontCheckBox.value = true;
                try {
                    pnl.font.setFont(opts.font, opts.fontSize);
                }
                catch(e) {
                    alert(I18n.ERROR_OPT_FONT_NOT_FOUND + ' ' + opts.font);
                }
            }
            Emit(pnl.setFontCheckBox.onClick);
        }
        if (opts.antiAlias !== undefined && opts.antiAlias !== 0) {
            let isOn = opts.antiAlias > 0;
            let val = Math.abs(opts.antiAlias);
            pnl.setAntiAliasCheckBox.value = isOn;
            let aaIdx: { [key: number]: number } = { 3: 0, 2: 1, 4: 2, 5: 3, 1: 4 };
            let idx = aaIdx[val] || 0;
            pnl.antiAliasList.selection = pnl.antiAliasList.items[idx];
            Emit(pnl.setAntiAliasCheckBox.onClick);
        }
        if (opts.textColor !== undefined && opts.textColor !== "") {
            pnl.setTextColorCheckBox.value = true;
            pnl.textColorTextBox.text = opts.textColor;
            Emit(pnl.setTextColorCheckBox.onClick);
        }
        if (opts.verticalRoman !== undefined && opts.verticalRoman) {
            pnl.verticalRomanCheckBox.value = true;
        }
        if (opts.tateChuYokoPatterns !== undefined && opts.tateChuYokoPatterns !== "") {
            pnl.tateChuYokoCheckBox.value = true;
            pnl.tateChuYokoTextBox.text = opts.tateChuYokoPatterns;
            Emit(pnl.tateChuYokoCheckBox.onClick);
        }
        if (opts.tsumeChars !== undefined && opts.tsumeChars !== "") {
            pnl.tsumeCheckBox.value = true;
            pnl.tsumeCharsTextBox.text = opts.tsumeChars;
            if (opts.tsumePercent !== undefined && opts.tsumePercent !== 0) {
                pnl.tsumePercentTextBox.text = opts.tsumePercent.toString();
            }
            Emit(pnl.tsumeCheckBox.onClick);
        }
        if (opts.textLeading !== undefined) {
            if (opts.textLeading === 0) {
                pnl.setTextLeadingCheckBox.value = false;
            } else {
                pnl.setTextLeadingCheckBox.value = true;
                pnl.textLeadingTextBox.text = opts.textLeading;
            }
            Emit(pnl.setTextLeadingCheckBox.onClick);
        }
        let getOption = (opts: CustomOptions): CustomOptions  | null => {
            opts.docTemplate =
                pnl.docTemplatePnl.autoTemplateRb.value ? OptionDocTemplate.Auto : (
                    pnl.docTemplatePnl.noTemplateRb.value ? OptionDocTemplate.No : (
                        pnl.docTemplatePnl.customTemplateRb.value ? OptionDocTemplate.Custom : OptionDocTemplate.Auto
                    )
                );
            opts.docTemplateCustomPath = pnl.docTemplatePnl.customTemplateTextbox.text;
            if (pnl.setFontCheckBox.value) {
                let font = pnl.font.getFont()
                opts.font = font.font;
                opts.fontSize = font.size;
            } else {
                opts.font = "";
                opts.fontSize = 0;
            }
            let aaMap: { [key: string]: number } = { "犀利": 3, "锐利": 2, "浑厚": 4, "平滑": 5, "无": 1 };
            let aliasVal = aaMap[pnl.antiAliasList.selection.text] || 3;
            opts.antiAlias = (pnl.setAntiAliasCheckBox.value) ? aliasVal : -aliasVal;
            opts.textColor = (pnl.setTextColorCheckBox.value) ? pnl.textColorTextBox.text : "";
            opts.verticalRoman = pnl.verticalRomanCheckBox.value;
            opts.textLeading = (pnl.setTextLeadingCheckBox.value) ? pnl.textLeadingTextBox.text : 0;
            opts.tateChuYokoPatterns = (pnl.tateChuYokoCheckBox.value) ? pnl.tateChuYokoTextBox.text : "";
            opts.tsumeChars = (pnl.tsumeCheckBox.value) ? pnl.tsumeCharsTextBox.text : "";
            if (pnl.tsumeCheckBox.value && pnl.tsumePercentTextBox.text !== "") {
                let tp = Number(pnl.tsumePercentTextBox.text);
                opts.tsumePercent = isNaN(tp) ? 80 : tp;
            } else {
                opts.tsumePercent = 0;
            }
            opts.textDirection = <OptionTextDirection> I18n.LIST_TEXT_DIT_ITEMS.indexOf(pnl.textDirList.selection.text);
            return opts;
        }

        return {getOption: getOption};
    }

    private uiAutomationPanel = (pnl: any): PanelDesc => {
        let xOfs = 16, yOfs = 142;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_AUTOMATION;

        // text replacing(example:"A->B|C->D")
        pnl.textReplaceCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_TEXT_REPLACE);
        pnl.textReplaceCheckBox.onClick = () => {
            pnl.textReplaceTextBox.enabled = pnl.textReplaceCheckBox.value;
        };
        xx += 260;
        pnl.textReplaceTextBox = pnl.add('edittext', [xx, yy, xx + 330, yy + 20]);
        xx += 340;
        pnl.textReplacePresetBtn = pnl.add('button', [xx, yy - 2, xx + 90, yy + 20], I18n.BUTTON_TEXT_REPLACE_PRESET);
        pnl.textReplacePresetBtn.onClick = () => {
            pnl.textReplaceTextBox.text = "?->？|!->！|!!->！！|～->~|!?->！？";
        }
        xx = xOfs;
        yy += 36;

        // run action
        pnl.runActionGroupCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20],
            I18n.CHECKBOX_RUN_ACTION);
        pnl.runActionGroupCheckBox.onClick = () => {
            pnl.runActionGroupList.enabled = pnl.runActionGroupCheckBox.value;
        }
        xx += 260;
        let sets = Stdlib.getActionSets();
        let setNames: string[] = [];
        for (let s = 0; s < sets.length; s++) {
            setNames.push(sets[s].name);
        }
        pnl.runActionGroupList = pnl.add('dropdownlist', [xx, yy, xx + 200, yy + 20], setNames);
        if (setNames.length > 0) {
            let findDefault = pnl.runActionGroupList.find("LabelPlusAction");
            pnl.runActionGroupList.selection = (findDefault !== null) ? findDefault : pnl.runActionGroupList.items[0];
        }
        pnl.runActionGroupList.enabled = false;
        let helpBtn = pnl.add('button', [xx + 210, yy - 2, xx + 240, yy + 20], "?");
        helpBtn.onClick = () => {
            alert(I18n.HELP_RUN_ACTION);
        };

        xx = xOfs;
        yy += 36;

        // dialog overlay
        pnl.dialogOverlayCheckBox = pnl.add('checkbox', [xx, yy, xx + 300, yy + 20], I18n.CHECKBOX_DIALOG_OVERLAY);
        pnl.dialogOverlayCheckBox.onClick = () => {
            let enable = pnl.dialogOverlayCheckBox.value;
            pnl.overlayPnl.enabled = enable;
        }

        // pnl
        xx = xOfs;
        yy += 30;
        pnl.overlayPnl = pnl.add('panel', [xx, yy, xx + 782, yy + 100]);
        stylePanelTint(pnl.overlayPnl);

        {
            let xx = xOfs + 6;
            let yy = 8;
            let doPnl = pnl.overlayPnl;

            doPnl.toleranceLabel = doPnl.add('statictext', [xx, yy, xx + 60, yy + 20], I18n.LABEL_DIALOG_OVERLAY_TOLERANCE);
            xx += 65;
            doPnl.toleranceTextBox = doPnl.add('edittext', [xx, yy, xx + 50, yy + 20]);
            doPnl.toleranceTextBox.text = "16";


            xx = xOfs + 6;
            yy += 28;
            pnl.overlayPnl.overlayGroupLabel = doPnl.add('statictext', [xx, yy, xx + 480, yy + 22], I18n.LABEL_DIALOG_OVERLAY_GROUP, { multiline: true });
            styleDim(pnl.overlayPnl.overlayGroupLabel);
            yy += 28;

            doPnl.groupTextBox = doPnl.add('edittext', [xx, yy, xx + 440, yy + 20]);
            xx += 445;
            let arr = [""];
            doPnl.addGroupList = doPnl.add('dropdownlist', [xx, yy - 1, xx + 120, yy + 21], arr);
            let func = () => {
                doPnl.groupTextBox.text += "," + doPnl.addGroupList.selection.text;
                doPnl.addGroupList.onChange = undefined;
                doPnl.addGroupList.selection = doPnl.addGroupList.find("");
                doPnl.addGroupList.onChange = func;
            }
            doPnl.addGroupList.onChange = func;

        }

        let opts = this.opts;
        if (opts.textReplace !== undefined) {
            pnl.textReplaceCheckBox.value = (opts.textReplace !== "");
            pnl.textReplaceTextBox.text = (opts.textReplace !== "") ? opts.textReplace : "！？->!?|...->…";
            Emit(pnl.textReplaceCheckBox.onClick);
        }
        if (opts.actionGroup !== undefined) {
            pnl.runActionGroupCheckBox.value = (opts.actionGroup !== "");
            let item = pnl.runActionGroupList.find(opts.actionGroup);
            if (item !== undefined)
                pnl.runActionGroupList.selection = item;
            Emit(pnl.runActionGroupCheckBox.onClick);
        }
        if (opts.dialogOverlayLabelGroups !== undefined) {
            pnl.dialogOverlayCheckBox.value = (opts.dialogOverlayLabelGroups !== "");
            pnl.overlayPnl.groupTextBox.text = opts.dialogOverlayLabelGroups;
            Emit(pnl.dialogOverlayCheckBox.onClick);
        }
        if (opts.dialogOverlayTolerance !== undefined) {
            pnl.overlayPnl.toleranceTextBox.text = opts.dialogOverlayTolerance.toString();
        }

        let getOption = (opts: CustomOptions): CustomOptions | null => {
            opts.textReplace = (pnl.textReplaceCheckBox.value) ? pnl.textReplaceTextBox.text : "";
            if (pnl.runActionGroupCheckBox.value && pnl.runActionGroupList.selection) {
                opts.actionGroup = pnl.runActionGroupList.selection.text;
            }
            opts.dialogOverlayLabelGroups = (pnl.dialogOverlayCheckBox.value)? pnl.overlayPnl.groupTextBox.text : "";
            if (pnl.overlayPnl.toleranceTextBox.text !== "") {
                let tol = Number(pnl.overlayPnl.toleranceTextBox.text);
                opts.dialogOverlayTolerance = isNaN(tol) ? 16 : tol;
            }
            return opts;
        }

        return {getOption: getOption};
    }

    // 帮助 / 关于 对话框：点击链接用浏览器打开
    private showHelpDialog = () => {
        /// @ts-ignore
        let dlg = new Window('dialog', I18n.HELP_TITLE, [0, 0, 500, 290]);
        /// @ts-ignore
        dlg.center();

        let yy = 18;
        /// @ts-ignore
        let noteText = dlg.add('statictext', [20, yy, 480, yy + 20], I18n.HELP_NOTE);
        styleBold(noteText);
        yy += 28;
        /// @ts-ignore
        let hintText = dlg.add('statictext', [20, yy, 480, yy + 20], I18n.HELP_HINT);
        styleDim(hintText);
        yy += 28;

        let addLink = (label: string, url: string) => {
            /// @ts-ignore
            let t = dlg.add('statictext', [20, yy, 480, yy + 20], label);
            t.onClick = () => { openUrl(url); };
            styleLink(t);
            yy += 24;
        };
        addLink(I18n.HELP_LINK_DOCS + "：" + DOCS_URL + I18n.HELP_CLICK, DOCS_URL);
        addLink(I18n.HELP_LINK_VIDEO + "：" + VIDEO_URL + I18n.HELP_CLICK, VIDEO_URL);
        addLink(I18n.HELP_LINK_PROJECT + "：" + PROJECT_URL + I18n.HELP_CLICK, PROJECT_URL);
        yy += 24; // 空一行，与下方版本行拉开距离

        // 版本号 + 更新检测（合并为一行，整体居中）；有新版本时点击可跳转下载，否则点击重新检查
        let hasNewVersion = false;
        let versionPrefix = I18n.APP_NAME + " " + VERSION + "  ";
        let statusY = yy;
        /// @ts-ignore
        let statusText = dlg.add('statictext', [20, statusY, 480, statusY + 20], versionPrefix + I18n.HELP_VERSION_CHECKING);
        styleBold(statusText);
        let centerStatus = () => {
            // 粗略估算文本宽度（中文/全角按 13px，其余 7px），据此让整行居中
            try {
                let w = 0;
                for (let i = 0; i < statusText.text.length; i++) {
                    w += (statusText.text.charCodeAt(i) > 255) ? 13 : 7;
                }
                if (w > 460) {
                    w = 460;
                }
                statusText.bounds = [250 - w / 2, statusY, 250 + w / 2, statusY + 20];
            } catch (e) { }
            try { statusText.justify = "center"; } catch (e) { }
        };
        let runCheck = () => {
            statusText.text = versionPrefix + I18n.HELP_VERSION_CHECKING;
            centerStatus();
            /// @ts-ignore
            dlg.update();
            let latest = fetchLatestReleaseTag();
            if (latest === null) {
                hasNewVersion = false;
                statusText.text = versionPrefix + I18n.HELP_VERSION_FAILED;
            } else if (isVersionNewer(latest, VERSION)) {
                hasNewVersion = true;
                statusText.text = versionPrefix + I18n.HELP_VERSION_NEW + " V" + latest + I18n.HELP_VERSION_CLICK;
            } else {
                hasNewVersion = false;
                statusText.text = versionPrefix + I18n.HELP_VERSION_LATEST;
            }
            centerStatus();
            /// @ts-ignore
            dlg.update();
        };
        statusText.onClick = () => { if (hasNewVersion) { openUrl(RELEASE_URL); } else { runCheck(); } };
        centerStatus();
        yy += 24;

        /// @ts-ignore
        dlg.add('button', [200, yy + 30, 300, yy + 55], I18n.BUTTON_CLOSE).onClick = () => { dlg.close(); };

        // 打开对话框时自动检测一次更新
        /// @ts-ignore
        dlg.onShow = runCheck;

        /// @ts-ignore
        dlg.show();
    }

    private allPanelEnable = (enable: boolean) => {
        this.inputPnl.enabled = enable;
        this.outputPnl.enabled = enable;
        this.stylePnl.enabled = enable;
        this.automationPnl.enabled = enable;
    }

    public mainPannel = (pnl: any) => {
        let xOfs = 14, yOfs = 0;
        let xx = xOfs,  yy = yOfs;
        let ret: PanelDesc;

        this.optPickers = [];

        // lp text select
        ret = this.uiLpTextSelect(pnl);
        this.addToPickerList(ret.getOption);
        yy += 40;
        yOfs = yy;

        // setting save/load buttons (below the lp-text row)
        {
            let win = GenericUI.getWindow(pnl);
            let fileMask = "INI Files: *.ini, All Files: *.*";
            let defFile = DEFAULT_INI_PATH;
            let bx = 450;
            let by = 8;
            let bw = 90;
            let gap = 8;
            let loadBtn = pnl.add('button', [bx, by, bx + bw, by + 30], I18n.BUTTON_LOAD);
            let saveBtn = pnl.add('button', [bx + bw + gap, by, bx + bw * 2 + gap, by + 30], I18n.BUTTON_SAVE);
            let resetBtn = pnl.add('button', [bx + (bw + gap) * 2, by, bx + bw * 3 + gap * 2, by + 30], I18n.BUTTON_RESET);
            loadBtn.onClick = () => {
                let sel = Stdlib.createFileSelect(fileMask);
                if (isMac()) {
                    sel = undefined;
                }
                let f = Stdlib.selectFileOpen("Read Setting", sel, defFile);
                if (f) {
                    this.opts = readIni(f);
                    win.close(4);
                }
            };
            saveBtn.onClick = () => {
                let sel = Stdlib.createFileSelect(fileMask);
                if (isMac()) {
                    sel = undefined;
                }
                let f = Stdlib.selectFileSave("Save Setting", sel, defFile);
                if (f) {
                    let mgr = win.mgr;
                    let res = mgr.validatePanel(win.appPnl, win.ini, true);
                    if (typeof (res) !== 'boolean') {
                        writeIni(f, res);
                    }
                }
            };
            resetBtn.onClick = () => {
                this.opts = new CustomOptions();
                this.lpFile = null;
                win.close(4);
            };
        }

        // panes as tabs
        let tabs = pnl.add('tabbedpanel', [14, 44, 846, 562]);
        let tabInput = tabs.add('tab', [6, 26, 826, 512], I18n.PANEL_INPUT);
        let tabOutput = tabs.add('tab', [6, 26, 826, 512], I18n.PANEL_OUTPUT);
        let tabStyle = tabs.add('tab', [6, 26, 826, 512], I18n.PANEL_STYLE);
        let tabAutomation = tabs.add('tab', [6, 26, 826, 512], I18n.PANEL_AUTOMATION);

        stylePanelTint(tabInput);
        stylePanelTint(tabOutput);
        stylePanelTint(tabStyle);
        stylePanelTint(tabAutomation);

        this.inputPnl = tabInput;
        ret = this.uiInputPanel(this.inputPnl);
        this.addToPickerList(ret.getOption);

        this.outputPnl = tabOutput;
        ret = this.uiOutputPanel(this.outputPnl);
        this.addToPickerList(ret.getOption);

        this.stylePnl = tabStyle;
        ret = this.uiStylePanel(this.stylePnl);
        this.addToPickerList(ret.getOption);

        this.automationPnl = tabAutomation;
        ret = this.uiAutomationPanel(this.automationPnl);
        this.addToPickerList(ret.getOption);

        // cancel hint (centered)
        let escHint = pnl.add('statictext', [300, 566, 580, 584], I18n.HINT_ESC_STOP);
        styleDim(escHint);

        // help / about (in the top toolbar row)
        let helpBtn = pnl.add('button', [744, 8, 834, 38], I18n.BUTTON_HELP);
        helpBtn.onClick = () => { this.showHelpDialog(); };

        this.allPanelEnable(this.lpFile != null);
        return pnl;
    }

    private getCustomOptions = (toFile: boolean): CustomOptions | null => {
        let new_opts = new CustomOptions();
        for (let i = 0; i < this.optPickers.length; i++) {
            let ret = this.optPickers[i](new_opts, toFile);
            if (ret === null) {
                return null
            }
            new_opts = ret;
        }
        return new_opts;
    }

    

    createPanel(pnl: any, ini: never) {
        this.mainPannel(pnl);
        this.moveWindow(100, 100);
    }

    // validate user panel, generate CustomOptions
    // tofile: if it is saving config to file
    validatePanel(pnl: any, ini: any, tofile: boolean) :CustomOptions | boolean {
        let opts = this.getCustomOptions(tofile);
        if (opts === null) {
            return true; // continue, will not close the indow
        }

        // check image source exsits
        for (let i = 0; i < opts.imageSelected.length; i++) {
            let item = opts.imageSelected[i].matched_file;
            let file_name = item.substring(0, item.lastIndexOf('.'));
            let path = opts.source + dirSeparator + file_name;
            
            let is_exist : boolean = false;
            for(let j = 0; j < image_suffix_list.length; j++) {
                let new_path = path + image_suffix_list[j];
                if(FileIsExists(new_path)) {
                    is_exist = true;
                    break;
                }
            }
            if (!is_exist) {
                alert(I18n.ERROR_HAVE_NO_MATCH_IMG, 'error', true);
                Emit(this.inputPnl.checkSourceMatchButton.onClick);
                return true; // continue, will not close the indow
            }
        }

        return opts; // go process()
    };

    process(opts: CustomOptions, doc: any)
    {
        let result = false;

        try {
            writeIni(DEFAULT_INI_PATH, opts); // auto save ini
            result = importFiles(opts);
        } catch (e) {
            log_err('All log:');
            log_err(alllog);
            log_err('Unexpected Error:');
            log_err(Stdlib.exceptionMessage(e));
        }
        if (result && (errlog == "")) {
            alert(I18n.COMPLETE);
            return;
        }
        else if (result && (errlog != "")) {
            alert(I18n.COMPLETE_WITH_ERROR, "error", true);
        }
        else if (!result) {
            alert(I18n.COMPLETE_FAILED, "error", true);
        }

        var logwin = new LogWindow('Error');
        logwin.append(errlog);
        logwin.show();
    }
}

function writeIni (iniFile: string, ini: CustomOptions) {
    if (!ini || !iniFile) {
        return;
    }
    let file = GenericUI.iniFileToFile(iniFile);

    if (!file) {
        throw new Error("Bad ini file specified: \"" + iniFile + "\".");
    }

    if (file.open("w", "TEXT", "????")) {
        file.lineFeed = "unix";
        file.encoding = 'UTF-8';
        let str = jamJSON.stringify(ini, "\n");
        file.write(str);
        file.close();
    }
    return ini;
};

function readIni(iniFile: string): CustomOptions {
    let ini = new CustomOptions();
    let file = GenericUI.iniFileToFile(iniFile);

    if (!file) {
        throw new Error("Bad ini file specified: \"" + iniFile + "\".");
    }
    if (file.exists && file.open("r", "TEXT", "????")) {
        file.lineFeed = "unix";
        file.encoding = 'UTF-8';
        let str = file.read();
        ini = jamJSON.parse(str);
        file.close();
    }

    return ini;
};

// get text/index info from listbox ojbect
function getSelectedItemsText(listBox: any): { text: string, index: number }[]
{
    let item_list = new Array();
    for (let i = 0; i < listBox.children.length; i++) {
        let item = listBox.children[i];
        if (item.selected) {
            item_list.push({ text: item.text, index: item.index });
        }
    }
    return item_list;
}

let ui = new LabelPlusInput();
ui.exec();

} // namespace LabelPlus
