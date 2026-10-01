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

    private settingsPnl: any;
    private inputPnl: any;
    private outputPnl: any;
    private stylePnl: any;
    private automationPnl: any;

    constructor() {
        super();
        this.saveIni = false;
        this.hasBorder = false;
        this.settingsPanel = false;
        this.winRect = { x: 200, y: 200, w: 875, h: 645 };
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
        let xx: number = 10, yy: number = 10;
        pnl.lpTextFileLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_TEXT_FILE);
        xx += 120;
        pnl.lpTextFileTextBox = pnl.add('edittext', [xx, yy, xx + 300, yy + 20], '');
        pnl.lpTextFileTextBox.enabled = false;
        xx += 305;
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

    private uiSettingsPanel = (pnl: any): PanelDesc => {
        let win = GenericUI.getWindow(pnl.parent);

        pnl.text = I18n.LABEL_SETTING;

        pnl.fileMask = "INI Files: *.ini, All Files: *.*";
        pnl.loadPrompt = "Read Setting";
        pnl.savePrompt = "Save Setting";
        pnl.defaultFile = DEFAULT_INI_PATH;

        let w = pnl.bounds[2] - pnl.bounds[0];
        let offsets = [w * 0.2, w * 0.5, w * 0.8];
        let y = 15;
        let bw = 90;

        let x = offsets[0] - (bw / 2);
        pnl.load = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_LOAD);
        x = offsets[1] - (bw / 2);
        pnl.save = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_SAVE);
        x = offsets[2] - (bw / 2);
        pnl.reset = pnl.add('button', [x, y, x + bw, y + 20], I18n.BUTTON_RESET);

        pnl.load.onClick = () => {
            let def = pnl.defaultFile;
            let prmpt = pnl.loadPrompt;
            let sel = Stdlib.createFileSelect(pnl.fileMask);
            if (isMac()) {
                sel = undefined;
            }
            let f = Stdlib.selectFileOpen(prmpt, sel, def);
            if (f) {
                this.opts = readIni(f);
                win.close(4);
            }
        };
        pnl.save.onClick = () => {
            let def = pnl.defaultFile;
            let prmpt = pnl.savePrompt;
            let sel = Stdlib.createFileSelect(pnl.fileMask);

            if (isMac()) {
                sel = undefined;
            }

            let f = Stdlib.selectFileSave(prmpt, sel, def);
            if (f) {
                let mgr = win.mgr;
                let res = mgr.validatePanel(win.appPnl, win.ini, true);

                if (typeof (res) !== 'boolean') {
                    writeIni(f, res);
                }
            }
        };
        pnl.reset.onClick = () => {
            this.opts = new CustomOptions();
            this.lpFile = null;
            win.close(4);
        };

        return { };
    };

    private uiInputPanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_INPUT;

        // image source folder select
        pnl.sourceLabel = pnl.add('statictext', [xx, yy, xx + 80, yy + 20], I18n.LABEL_SOURCE);
        xx += 90;
        pnl.sourceTextBox = pnl.add('edittext', [xx, yy, xx + 205, yy + 20], '');
        xx += 210;
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
        yy += 25;

        // match image file by order
        pnl.matchImgByOrderCheckBox = pnl.add('checkbox', [xx, yy, xx + 190, yy + 20], I18n.CHECKBOX_MATCH_IMG_BY_ORDER);
        pnl.matchImgByOrderCheckBox.onClick = () => {
            if (pnl.matchImgByOrderCheckBox.value) {
                pnl.replaceImgSuffixCheckBox.value = false; // incompatible to "replace image suffix"
                Emit(pnl.replaceImgSuffixCheckBox.onClick);
            }
        }
        xx += 195;
        pnl.checkSourceMatchButton = pnl.add('button', [xx, yy - 2, xx + 80, yy + 20], I18n.BUTTON_SOURCE_CHECK_MATCH);
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
        yy += 25;

        // replace image suffix
        pnl.replaceImgSuffixCheckBox = pnl.add('checkbox', [xx, yy, xx + 190, yy + 20], I18n.CHECKBOX_REPLACE_IMG_SUFFIX);
        pnl.replaceImgSuffixCheckBox.onClick = () => {
            if (pnl.replaceImgSuffixCheckBox.value) {
                pnl.matchImgByOrderCheckBox.value = false; // incompatible to "match image file by order"
                Emit(pnl.matchImgByOrderCheckBox.onClick);
            }
            let enable = pnl.replaceImgSuffixCheckBox.value;
            pnl.replaceImgSuffixTextbox.enabled = enable;
            pnl.setSourceFileTypeList.enabled = enable;
        }
        xx += 195;
        pnl.replaceImgSuffixTextbox = pnl.add('edittext', [xx, yy, xx + 80, yy + 20]);
        xx += 85;
        let type_list = [""];
        type_list = type_list.concat(image_suffix_list);
        pnl.setSourceFileTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 50, yy + 21], type_list);
        let func = () => {
            pnl.replaceImgSuffixTextbox.text = pnl.setSourceFileTypeList.selection.text;
            pnl.setSourceFileTypeList.onChange = undefined;
            pnl.setSourceFileTypeList.selection = pnl.setSourceFileTypeList.find("");
            pnl.setSourceFileTypeList.onChange = func;
        }
        pnl.setSourceFileTypeList.onChange = func;
        xx = xOfs;
        yy += 23;

        // selct img
        yOfs = yy;
        pnl.chooseImageLabel = pnl.add('statictext', [xx, yy, xx + 150, yy + 20], I18n.LABEL_SELECT_IMG);
        yy += 23;
        pnl.chooseImageListBox = pnl.add('listbox', [xx, yy, xx + 150, yy + 260], [], { multiselect: true });

        // select label group
        yy = yOfs;
        xx = xOfs + 175;
        pnl.chooseGroupLabel = pnl.add('statictext', [xx, yy, xx + 150, yy + 20], I18n.LABEL_SELECT_GROUP);
        yy += 23;
        pnl.chooseGroupListBox = pnl.add('listbox', [xx, yy, xx + 150, yy + 260], [], { multiselect: true });
        xx = xOfs;
        yy += 265;

        // tip for multiple selection
        pnl.add('statictext', [xx, yy, xx + 330, yy + 44], I18n.LABEL_SELECT_TIP, { multiline: true });

        let getOption = (opts: CustomOptions, toFile: boolean): CustomOptions | null => {
            if (!toFile) {
                // image source folder
                let f = new Folder(pnl.sourceTextBox.text);
                if (!f || !f.exists) {
                    alert(I18n.ERROR_NOT_FOUND_SOURCE);
                    return null;
                }
                opts.source = f.fsName;

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
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_OUTPUT;

        // output folder
        pnl.targetLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_TARGET);
        xx += 120;
        pnl.targetTextBox = pnl.add('edittext', [xx, yy, xx + 300, yy + 20], '');
        xx += 305;
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
        yy += 23;

        // output file type
        pnl.outputTypeLabel = pnl.add('statictext', [xx, yy, xx + 120, yy + 20], I18n.LABEL_OUTPUT_FILE_TYPE);
        let type_arr: string[] = [];
        for (let i = 0; i < OptionOutputType._count; i++) {
            type_arr[i] = OptionOutputType[i];
        }
        xx += 120;
        pnl.outputTypeList = pnl.add('dropdownlist', [xx, yy - 1, xx + 100, yy + 21], type_arr);
        xx = xOfs;
        yy += 23;

        // ignore images with no label
        pnl.ignoreNoLabelImgCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_IGNORE_NO_LABEL_IMG);
        pnl.ignoreNoLabelImgCheckBox.value = true;
        xx += 250;

        // do not close image document after importing complete
        pnl.notCloseCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_NOT_CLOSE);
        xx = xOfs;
        yy += 23;

        // output label index as text layer
        pnl.outputLabelIndexCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_OUTPUT_LABEL_INDEX);
        xx += 250;

        // do not create layer group
        pnl.noLayerGroupCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_NO_LAYER_GROUP);
        xx = xOfs;
        yy += 23;

        // ppi
        pnl.setPPICheckBox = pnl.add('checkbox', [xx, yy, xx + 100, yy + 20], I18n.CHECKBOX_SET_PPI);
        pnl.setPPICheckBox.onClick = () => {
            pnl.ppiTextBox.enabled = pnl.setPPICheckBox.value;
        }
        xx += 105;
        pnl.ppiTextBox = pnl.add('edittext', [xx, yy, xx + 50, yy + 20]);
        pnl.ppiTextBox.enabled = false;
        pnl.ppiTextBox.text = "300";
        xx = xOfs;
        yy += 23;

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
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_STYLE;

        // template settings
        pnl.docTemplatePnl = pnl.add('panel', [xx, yy, xx + 460, yy + 65], I18n.PANEL_TEMPLATE_SETTING);

        let pnll: any = pnl.docTemplatePnl;
        let xxxOfs: number = 5;
        let xxx: number = xxxOfs;
        let yyy: number = 5;
        pnll.autoTemplateRb = pnll.add('radiobutton',  [xxx, yyy, xxx + 200, yyy + 20], I18n.RB_TEMPLATE_AUTO); xxx += 200;
        pnll.autoTemplateRb.value = true;
        pnll.noTemplateRb = pnll.add('radiobutton',  [xxx, yyy, xxx + 200, yyy + 20], I18n.RB_TEMPLATE_NO); xxx += 200;
        xxx = xxxOfs;
        yyy += 23;
        pnll.customTemplateRb = pnll.add('radiobutton', [xxx, yyy, xxx + 130, yyy + 20], I18n.RB_TEMPLATE_CUSTOM); xxx += 135;
        pnll.customTemplateTextbox = pnll.add('edittext', [xxx, yyy, xxx + 180, yyy + 20]); xxx += 185;
        pnll.customTemplateTextButton = pnll.add('button', [xxx, yyy - 2, xxx + 30, yyy + 20], '...'); xxx += 30;
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
        yy += 70;

        // text direction
        pnl.textDirLabel = pnl.add('statictext', [xx, yy, xx + 100, yy + 20], I18n.LABEL_TEXT_DIRECTION);
        xx += 100;
        pnl.textDirList = pnl.add('dropdownlist', [xx, yy, xx + 100, yy + 20], I18n.LIST_TEXT_DIT_ITEMS);
        pnl.textDirList.selection = pnl.textDirList.find(I18n.LIST_TEXT_DIT_ITEMS[0]);
        xx = xOfs;
        yy += 23;

        // set font
        {
            pnl.setFontCheckBox = pnl.add('checkbox', [xx, yy, xx + 100, yy + 20], I18n.CHECKBOX_SET_FONT);
            pnl.setFontCheckBox.onClick = () => {
                let value = pnl.setFontCheckBox.value;
                pnl.font.family.enabled = value;
                pnl.font.style.enabled = value;
                pnl.font.fontSize.enabled = value;
            }
            xx += 105;
            pnl.font = pnl.add('group', [xx, yy + 2, xx + 365, yy + 25]);
            this.createFontPanel(pnl.font, undefined, "", 0);
            pnl.font.family.enabled = false;
            pnl.font.style.enabled = false;
            pnl.font.fontSize.enabled = false;
            pnl.font.family.selection = pnl.font.family.find("SimSun");
            xx = xOfs;
            yy += 25;
        }

        // anti-alias (left) | text color (right)
        let colR = 250; // right column start
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
        pnl.textColorTextBox = pnl.add('edittext', [colR + 105, yy, colR + 185, yy + 20]);
        pnl.textColorTextBox.enabled = false;
        pnl.textColorTextBox.text = "#000000";
        xx = xOfs;
        yy += 23;

        // vertical roman (left) | leading (right)
        pnl.verticalRomanCheckBox = pnl.add('checkbox', [xx, yy, xx + 230, yy + 20], I18n.CHECKBOX_VERTICAL_ROMAN);
        // leading on the right
        pnl.setTextLeadingCheckBox = pnl.add('checkbox', [colR, yy, colR + 100, yy + 20], I18n.CHECKBOX_SET_LEADING);
        pnl.setTextLeadingCheckBox.onClick = () => {
            pnl.textLeadingTextBox.enabled = pnl.setTextLeadingCheckBox.value;
        }
        let lx = colR + 105;
        pnl.textLeadingTextBox = pnl.add('edittext', [lx, yy, lx + 50, yy + 20]);
        pnl.textLeadingTextBox.enabled = false;
        pnl.textLeadingTextBox.text = "120";
        pnl.add('statictext', [lx + 55, yy, lx + 95, yy + 20], "%");
        xx = xOfs;
        yy += 23;

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
            opts.textDirection = <OptionTextDirection> I18n.LIST_TEXT_DIT_ITEMS.indexOf(pnl.textDirList.selection.text);
            return opts;
        }

        return {getOption: getOption};
    }

    private uiAutomationPanel = (pnl: any): PanelDesc => {
        let xOfs = 10, yOfs = 20;
        let xx = xOfs,  yy = yOfs;

        pnl.text = I18n.PANEL_AUTOMATION;

        // text replacing(example:"A->B|C->D")
        pnl.textReplaceCheckBox = pnl.add('checkbox', [xx, yy, xx + 250, yy + 20], I18n.CHECKBOX_TEXT_REPLACE);
        pnl.textReplaceCheckBox.onClick = () => {
            pnl.textReplaceTextBox.enabled = pnl.textReplaceCheckBox.value;
        };
        xx += 260;
        pnl.textReplaceTextBox = pnl.add('edittext', [xx, yy, xx + 120, yy + 20]);
        xx += 125;
        pnl.textReplacePresetBtn = pnl.add('button', [xx, yy - 2, xx + 80, yy + 20], I18n.BUTTON_TEXT_REPLACE_PRESET);
        pnl.textReplacePresetBtn.onClick = () => {
            pnl.textReplaceTextBox.text = "?->？|!->！|!!->！！|～->~|!?->！？";
        }
        xx = xOfs;
        yy += 23;

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
        pnl.runActionGroupList = pnl.add('dropdownlist', [xx, yy, xx + 140, yy + 20], setNames);
        if (setNames.length > 0) {
            let findDefault = pnl.runActionGroupList.find("LabelPlusAction");
            pnl.runActionGroupList.selection = (findDefault !== null) ? findDefault : pnl.runActionGroupList.items[0];
        }
        pnl.runActionGroupList.enabled = false;
        let helpBtn = pnl.add('button', [xx + 145, yy - 2, xx + 175, yy + 20], "?");
        helpBtn.onClick = () => {
            alert(I18n.HELP_RUN_ACTION);
        };

        xx = xOfs;
        yy += 23;

        // dialog overlay
        pnl.dialogOverlayCheckBox = pnl.add('checkbox', [xx, yy, xx + 300, yy + 20], I18n.CHECKBOX_DIALOG_OVERLAY);
        pnl.dialogOverlayCheckBox.onClick = () => {
            let enable = pnl.dialogOverlayCheckBox.value;
            pnl.overlayPnl.enabled = enable;
        }

        // pnl
        xx += 10;
        yy += 23;
        pnl.overlayPnl = pnl.add('panel', [xx, yy, xx + 460, yy + 90]);

        {
            let xx = xOfs;
            let yy = 5;
            let doPnl = pnl.overlayPnl;

            doPnl.toleranceLabel = doPnl.add('statictext', [xx, yy, xx + 60, yy + 20], I18n.LABEL_DIALOG_OVERLAY_TOLERANCE);
            xx += 65;
            doPnl.toleranceTextBox = doPnl.add('edittext', [xx, yy, xx + 50, yy + 20]);
            doPnl.toleranceTextBox.text = "16";


            xx = xOfs;
            yy += 20;
            pnl.overlayPnl.overlayGroupLabel = doPnl.add('statictext', [xx, yy, xx + 430, yy + 36], I18n.LABEL_DIALOG_OVERLAY_GROUP, { multiline: true });
            yy += 36;

            doPnl.groupTextBox = doPnl.add('edittext', [xx, yy, xx + 250, yy + 20]);
            xx += 255;
            let arr = [""];
            doPnl.addGroupList = doPnl.add('dropdownlist', [xx, yy - 1, xx + 100, yy + 21], arr);
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

    private allPanelEnable = (enable: boolean) => {
        this.inputPnl.enabled = enable;
        this.outputPnl.enabled = enable;
        this.stylePnl.enabled = enable;
        this.automationPnl.enabled = enable;
    }

    public mainPannel = (pnl: any) => {
        let xOfs = 10, yOfs = 0;
        let xx = xOfs,  yy = yOfs;
        let ret: PanelDesc;

        this.optPickers = [];

        // lp text select
        ret = this.uiLpTextSelect(pnl);
        this.addToPickerList(ret.getOption);
        yy += 40;
        yOfs = yy;

        // setting save/load
        this.settingsPnl = pnl.add('panel', [xx, yy, xx + 355, yy + 50]);
        ret = this.uiSettingsPanel(this.settingsPnl);
        this.addToPickerList(ret.getOption);
        yy += 60;

        // input options
        this.inputPnl = pnl.add('panel', [xx, yy, xx + 355, yy + 430]);
        ret = this.uiInputPanel(this.inputPnl);
        this.addToPickerList(ret.getOption);

        // cancel hint
        let hintY = yy + 430 + 5;
        pnl.add('statictext', [xx + 10, hintY, xx + 345, hintY + 20], I18n.HINT_ESC_STOP);

        xx += 365;

        xOfs = xx;
        xx = xOfs;
        yy = yOfs;

        // output options
        this.outputPnl = pnl.add('panel', [xx, yy, xx + 480, yy + 145]);
        ret = this.uiOutputPanel(this.outputPnl);
        this.addToPickerList(ret.getOption);
        yy += 150;

        // style
        this.stylePnl = pnl.add('panel', [xx, yy, xx + 480, yy + 190]);
        ret = this.uiStylePanel(this.stylePnl);
        this.addToPickerList(ret.getOption);
        yy += 200;

        // automation
        this.automationPnl = pnl.add('panel', [xx, yy, xx + 480, yy + 190]);
        ret = this.uiAutomationPanel(this.automationPnl);
        this.addToPickerList(ret.getOption);
        yy += 180;

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
