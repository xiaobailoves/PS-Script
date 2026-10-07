namespace I18n {
    export var APP_NAME: string = "LabelPlus Script";

    export var BUTTON_RUN: string = "导入";
    export var BUTTON_CANCEL: string = "关闭";
    export var BUTTON_LOAD: string = "加载配置";
    export var BUTTON_SAVE: string = "保存配置";
    export var BUTTON_RESET: string = "还原配置";

    export var PANEL_INPUT: string = "输入";
    export var PANEL_OUTPUT: string = "输出";
    export var PANEL_STYLE: string = "格式";
    export var PANEL_AUTOMATION: string = "自动化";
    export var PANEL_TEXT_PROCESS: string = "文本处理";

    export var PANEL_TEMPLATE_SETTING: string = "文档模板设置";
    export var PANEL_OUTPUT_OPTIONS: string = "输出选项";
    export var RB_TEMPLATE_AUTO: string = "自动";
    export var RB_TEMPLATE_NO: string = "不使用模板（直接新建文件）";
    export var RB_TEMPLATE_CUSTOM: string = "自定义模板";

    export var LABEL_TEXT_FILE: string = "LabelPlus文本:";
    export var LABEL_SOURCE: string = "图源文件夹:";
    export var LABEL_OVERLAY_MANUAL: string = "涂白文件夹:";
    export var LABEL_TARGET: string = "输出文件夹:";
    export var LABEL_SETTING: string = "存取配置";
    export var LABEL_SELECT_IMG: string = "导入图片选择";
    export var LABEL_SELECT_GROUP: string = "导入分组选择";
    export var LABEL_SELECT_TIP: string = "提示：列表框中，按住Ctrl键选中/取消单个项目，按住Shift键批量选择项目。";


    export var CHECKBOX_OUTPUT_LABEL_INDEX: string = "导出标号";
    export var CHECKBOX_TEXT_REPLACE: string = "文本替换";
    export var CHECKBOX_IGNORE_NO_LABEL_IMG: string = "不输出未标号图片";
    export var CHECKBOX_MATCH_IMG_BY_ORDER: string = "按顺序匹配图片文件";
    export var BUTTON_SOURCE_CHECK_MATCH: string = "检查图源匹配情况";
    export var LABEL_OUTPUT_FILE_TYPE: string = "输出文件类型：";
    export var CHECKBOX_REPLACE_IMG_SUFFIX: string = "替换图片后缀名";
    export var CHECKBOX_RUN_ACTION: string = "执行自动化动作";
    export var CHECKBOX_NOT_CLOSE: string = "导入后不关闭文档";
    export var CHECKBOX_SET_FONT: string = "字体";
    export var CHECKBOX_SET_LEADING: string = "行距";
    export var CHECKBOX_SET_TEXT_COLOR: string  = "文字颜色";
    export var CHECKBOX_SET_ANTI_ALIAS: string  = "消除锯齿";
    export var CHECKBOX_VERTICAL_ROMAN: string  = "标准垂直罗马对齐";
    export var CHECKBOX_TATE_CHU_YOKO: string = "直排内横排";
    export var CHECKBOX_TSUME: string = "比例间距";
    export var CHECKBOX_VERTICAL_ROMAN_CHARS: string = "直立字符（直排）";
    export var CHECKBOX_KERNING_METRICS: string = "度量标准";
    export var TIP_TSUME: string = "按指定百分比强制挤压列出的字符（如「」等标点），不依赖字体，任何字体下都生效";
    export var TIP_KERNING_METRICS: string = "使用字体自带的两字间距微调（如西文 AV、部分日文字体的标点配对），效果取决于字体";
    export var TIP_TYPO_NOTE: string = "比例间距与字体无关；度量标准依赖字体配对，两者同时用于同一字符会叠加收紧。";
    export var TIP_MATCH_BY_ORDER: string = "不按文件名匹配：图片按顺序与图源文件夹中的文件一一对应（文件名与图源不一致时使用）";
    export var TIP_REPLACE_SUFFIX: string = "查找图源前，先把 LP 中的图片后缀替换为指定后缀（如图源是 .psd 而 LP 里写 .png）";
    export var TIP_CHECK_MATCH: string = "打开日志窗口预览每张图片匹配到的图源文件，导入前排查用";
    export var TIP_OVERLAY_MANUAL: string = "预先准备好的涂白图片文件夹（可选）：按文件名匹配作为涂白层，未匹配到的页跳过";
    export var TIP_OUTPUT_LABEL_INDEX: string = "在每个标签旁额外生成标签序号的文本层";
    export var TIP_NO_LAYER_GROUP: string = "文字图层直接放在最上层，不为标签分组创建图层组文件夹";
    export var TIP_SET_PPI: string = "把输出文档的分辨率覆盖为指定 PPI";
    export var TIP_TEMPLATE_AUTO: string = "根据图源文件名自动匹配 ps_script_res 目录中的预设模板";
    export var TIP_TEMPLATE_CUSTOM: string = "使用指定的 PSD/TIF 文件作为导入模板";
    export var TIP_TEXT_DIRECTION: string = "导入文字的排列方向；「默认」不修改，沿用模板或原设定";
    export var TIP_VERTICAL_ROMAN: string = "整体应用「标准垂直罗马对齐」：直排时西文/数字按标准方式排列，仅对纵向文字生效（默认开启）";
    export var TIP_TEXT_LEADING: string = "按字体大小的百分比设置自动行距（如 120%）";
    export var TIP_TATE_CHU_YOKO: string = "直排时，匹配的连续字符（如 !!、!?，用 | 分隔）转为占一个字宽的横排显示";
    export var TIP_TSUME_CHARS: string = "要挤压的字符列表（如 「」），每个列出的字符都会应用";
    export var TIP_TSUME_PERCENT: string = "挤压比例 10~90：越小标点压得越紧";
    export var TIP_VERTICAL_ROMAN_CHARS: string = "直排时对指定字符（默认 ?!）套用标准直立，即「标准垂直罗马对齐」的逐字符方案";
    export var TIP_TEXT_REPLACE: string = "导入时按 A->B|C->D 表达式替换标签文本，| 分隔多条规则";
    export var TIP_TEXT_REPLACE_PRESET: string = "一键填入常用标点转换示例";
    export var TIP_DIALOG_OVERLAY: string = "自动为指定分组的文字生成涂白层（覆盖原文字），实验功能";
    export var TIP_OVERLAY_TOLERANCE: string = "涂白判定容差，越大覆盖范围越宽";

    // 内置文本转换（全角/半角、简繁；简繁数据由用户自行从 OpenCC 下载）
    export var CHECKBOX_WIDTH_CONVERT: string = "全角/半角";
    export var LABEL_WIDTH_DIGITS: string = "数字";
    export var LABEL_WIDTH_LETTERS: string = "字母";
    export var LABEL_WIDTH_SYMBOLS: string = "标点";
    // 顺序必须与 OptionWidthConvert {Keep,ToHalf,ToFull} 一致：下标即枚举值
    export var LIST_WIDTH_CONVERT_ITEMS: string[] = [ "不转换", "全角→半角", "半角→全角" ];
    export var TIP_WIDTH_CONVERT: string = "勾选后按各类别所选方向转换字符宽度：数字 / 字母 / 标点（含空格）可分别选择「全角→半角」或「半角→全角」；只转所选方向，已是目标宽度的字符不变。先转换，再做文本替换";
    export var CHECKBOX_HAN_CONVERT: string = "简繁转换";
    // 顺序必须与 OptionHanConvert {Keep,S2T,T2S} 一致：下标即枚举值
    export var LIST_HAN_CONVERT_ITEMS: string[] = [ "不转换", "简→繁", "繁→简" ];
    export var BUTTON_HAN_DATA: string = "数据…";
    export var TIP_HAN_CONVERT: string = "勾选并在下拉中选择方向后才做简繁转换。数据需自行下载（不随脚本分发），点右侧「数据…」下载；未下载时导入会中止";
    export var TIP_HAN_DATA_BTN: string = "查看简繁转换数据状态：下载 / 重新下载 / 删除。数据来自 OpenCC 官方仓库，保存在用户配置目录";
    export var BUTTON_RULE_FILE: string = "文件…";
    export var TIP_RULE_FILE: string = "选择替换规则文件（.txt / .yml）：txt 每行一条 A->B（也可用 | 分隔）；yml 支持「源: 替换」映射行或「- A->B」列表项。勾选「文本替换」后与文本框同时生效，同一「源」以文本框为准";
    export var ERROR_RULE_FILE_NOT_FOUND: string = "替换规则文件不存在或无法读取：";

    export var DLG_HAN_TITLE: string = "简繁转换数据";
    export var HAN_INTRO: string = "转换数据不随脚本分发，需自行从 OpenCC 官方仓库下载（Apache-2.0 许可）。";
    export var PANEL_HAN_STATUS: string = "数据状态";
    export var HAN_ROW_S2T: string = "简→繁：";
    export var HAN_ROW_T2S: string = "繁→简：";
    export var HAN_STATUS_INSTALLED: string = "已安装";
    export var HAN_STATUS_NOT_INSTALLED: string = "未安装";
    export var HAN_SAVED_AT: string = "保存位置：";
    export var BUTTON_HAN_DOWNLOAD: string = "下载";
    export var BUTTON_HAN_REDOWNLOAD: string = "重新下载";
    export var BUTTON_HAN_REMOVE: string = "删除";
    export var TIP_HAN_DL_BTN: string = "从 GitHub 下载该方向的字典并在本地解析为紧凑缓存（需联网）";
    export var TIP_HAN_RM_BTN: string = "删除本地缓存，等同卸载；该方向需重新下载后才能使用";
    export var HAN_DL_DOWNLOADING: string = "正在下载 ";
    export var HAN_DL_PARSING: string = "正在解析字典…";
    export var HAN_DL_WRITING: string = "正在写入缓存…";
    export var HAN_DL_DONE: string = "完成：已安装 ";
    export var HAN_DL_CANCELLED: string = "已取消下载";
    export var HAN_DL_CANCEL_HINT: string = "（按 ESC 取消）";
    export var HAN_REMOVE_CONFIRM: string = "确定删除该方向的转换数据？删除后需重新下载才能使用。";
    export var HAN_REMOVED: string = "已删除";
    export var PANEL_HAN_NOTE: string = "说明";
    export var HAN_NEED_DOWNLOAD_CONFIRM: string = "该方向还没有下载转换数据（简→繁约 1.0 MB / 繁→简约 113 KB，需联网访问 GitHub）。现在打开数据窗口下载？";
    export var HAN_NOTE: string = "• 体积与联网：简→繁约 1.0 MB、繁→简约 113 KB；需访问 GitHub（raw.githubusercontent.com），可能失败或很慢、可直接重试；脚本除此之外不联网。\n" +
        "• 保存位置：用户配置目录 labelplus_script\\opencc（点「删除」即卸载）；下载后就地解析为缓存，原始字典文件随即删除。\n" +
        "• 准确性：用字按 OpenCC 习惯（爲 / 裏 / 麪 / 臺），与台港日常写法（為 / 裡 / 麵 / 台）可能不同；歧义字靠词组消歧，孤立字仍可能不合语境，可用「文本替换」规则修正。\n" +
        "• 字体缺字：转换后的繁体字可能不在当前字体覆盖范围内（显示为方框或异常字形），排版前请确认所用字体包含所需字符。\n" +
        "• 数据来源：OpenCC ver.1.4.2（github.com/BYVoid/OpenCC），Apache-2.0 许可。";
    export var ERROR_HAN_DATA_NOT_INSTALLED: string = "已选择简繁转换，但转换数据尚未下载：请到「自动化」页点击「数据…」下载后再导入。";
    export var ERROR_HAN_PRELOAD_FAILED: string = "简繁转换数据读取失败（缓存可能已损坏），已删除；请到「自动化」页「数据…」重新下载。";
    export var ERROR_HAN_DOWNLOAD_FAILED: string = "简繁转换数据下载失败，请重试（直接再点一次「下载」）；若反复失败，请检查网络能否访问 GitHub（raw.githubusercontent.com）。";
    export var ERROR_HAN_DL_VERIFY_FAILED: string = "下载文件校验失败（大小与预期不符），可能被网络中断截断，请重新下载。";
    export var ERROR_HAN_PARSE_FAILED: string = "简繁转换数据解析失败，请重新下载。";
    export var ERROR_HAN_CACHE_WRITE_FAILED: string = "简繁转换缓存写入失败，请检查磁盘空间与目录权限。";
    export var CHECKBOX_SET_PPI: string = "设置PPI";
    export var LABEL_TEXT_DIRECTION: string = "文字方向：";
    export var LIST_TEXT_DIT_ITEMS: string[] = [ "默认", "横向", "纵向" ];
    export var CHECKBOX_NO_LAYER_GROUP: string = "不对图层进行分组";

    export var BUTTON_TEXT_REPLACE_PRESET: string = "标点";
    export var BUTTON_HELP: string = "帮助";
    export var BUTTON_CLOSE: string = "关闭";
    export var HELP_TITLE: string = "帮助 / 关于";
    export var HELP_NOTE: string = "该版本为九九组特供魔改版，也欢迎大家使用。";
    export var HELP_HINT: string = "点击下列任意一行，用浏览器打开：";
    export var PANEL_HELP_LINKS: string = "相关链接";
    export var PANEL_HELP_ABOUT: string = "版本信息";
    export var HELP_LINK_DOCS: string = "使用教程网页";
    export var HELP_LINK_VIDEO: string = "B站安装教程";
    export var HELP_LINK_PROJECT: string = "项目地址";
    export var HELP_VERSION_CHECKING: string = "正在检测更新…";
    export var HELP_VERSION_FAILED: string = "更新检测失败（点击重试）";
    export var HELP_VERSION_RECHECK_TIP: string = "点击此行重新检测更新";
    export var HELP_VERSION_LATEST: string = "已是最新版本";
    export var HELP_VERSION_NEW: string = "发现新版本";
    export var HELP_VERSION_CLICK: string = "（点击此行下载）";
    export var HINT_ESC_STOP: string = "导入过程中按 ESC 可中途停止";
    export var HELP_RUN_ACTION: string = "动作组内可包含以下动作名（不存在的会被自动跳过）：\n\n" +
        "  _start — 每张图片处理前执行\n" +
        "  [分组名] — 每个标签创建后执行（如：框内、框外）\n" +
        "  _end — 每张图片处理后执行\n\n" +
        "可在 PS 动作面板中创建/重命名，动作名需完全一致。";
    export var PROGRESS_PREPARING: string = "准备中...";
    export var PROGRESS_PROCESSING: string = "正在处理: ";

    export var CHECKBOX_DIALOG_OVERLAY: string = "启用对话框自动涂白";
    export var LABEL_DIALOG_OVERLAY_GROUP: string = "指定需要涂白的分组(例如: 框内,心理)：";
    export var LABEL_DIALOG_OVERLAY_TOLERANCE: string = "容差：";

    export var COMPLETE: string = "导出完毕！";
    export var COMPLETE_WITH_ERROR: string = "导出完毕，但遇到些错误...";
    export var COMPLETE_FAILED: string = "导出失败！";

    export var ERROR_UNEXPECTED: string = "未预料到的错误，请与作者联系！";
    export var ERROR_FILE_OPEN_FAIL: string = "文件打开失败，请检查PS是否能正确打开该文件！";
    export var ERROR_FILE_SAVE_FAIL: string = "文件保存失败，请检查是否有磁盘操作权限、磁盘空间是否充足。";
    export var ERROR_NOT_FOUND_SOURCE: string = "未找到图源文件夹";
    export var ERROR_NOT_FOUND_OVERLAY: string = "未找到涂白文件夹";
    export var ERROR_NOT_FOUND_TARGET: string = "未找到目标文件夹";
    export var ERROR_NOT_FOUND_LPTEXT: string = "未找到LabelPlus文本文件";
    export var ERROR_NOT_FOUND_TEMPLATE: string = "未找到Photoshop模板文件";
    export var ERROR_CREATE_NEW_FOLDER: string = "无法创建新文件夹";
    export var ERROR_PARSER_LPTEXT_FAIL: string = "解析LabelPlus文本失败";
    export var ERROR_NO_IMG_CHOOSED: string = "未选择输出图片";
    export var ERROR_NO_LABEL_GROUP_CHOOSED: string = "未选择导入分组";
    export var ERROR_NO_MATCH_IMG: string = "找不到对应的图片文件！！";
    export var ERROR_HAVE_NO_MATCH_IMG: string = "存在无法匹配的图源文件，请重新检查！";
    export var ERROR_PRESET_TEMPLATE_NOT_FOUND: string = "无法自动匹配模板文件，请确认脚本所在目录是否存在ps_script_res目录";
    export var ERROR_TEXT_REPLACE_EXPRESSION: string = "文本替换表达式解析错误，请检查！";
    export var ERROR_OPT_FONT_NOT_FOUND: string = "找不到配置中保存的字体";

    declare var app: any;
    if (!(app.locale in {"zh_CN":1, "zh_TW":1, "zh_HK":1})) {
        BUTTON_RUN = "Run";
        BUTTON_CANCEL = "Cancel";
        BUTTON_LOAD = "Load";
        BUTTON_SAVE = "Save";
        BUTTON_RESET = "Reset";
        PANEL_INPUT = "Input";
        PANEL_OUTPUT = "Output";
        PANEL_STYLE = "Style";
        PANEL_AUTOMATION = "Automation";
        PANEL_TEXT_PROCESS = "Text Processing";
        PANEL_TEMPLATE_SETTING = "Document Template Setting";
        PANEL_OUTPUT_OPTIONS = "Output Options";
        RB_TEMPLATE_AUTO = "Auto";
        RB_TEMPLATE_NO = "No Template";
        RB_TEMPLATE_CUSTOM = "Custom Template";
        LABEL_TEXT_FILE = "LabelPlus Text:";
        LABEL_SOURCE = "Image Source:";
        LABEL_OVERLAY_MANUAL = "Overlay Folder:";
        LABEL_TARGET = "Output Folder:";
        LABEL_SETTING = "Setting";
        LABEL_SELECT_IMG = "Select Image";
        LABEL_SELECT_GROUP = "Select Group";
        LABEL_SELECT_TIP = "Tip: Push [Ctrl] key to select/cancel one item, push [Shift] key to select multiple items.";
        CHECKBOX_OUTPUT_LABEL_INDEX = "Output Label Number";
        CHECKBOX_TEXT_REPLACE = "Text Replace";
        CHECKBOX_IGNORE_NO_LABEL_IMG = "Ignore Images With No Label";
        CHECKBOX_MATCH_IMG_BY_ORDER = "Match Image Source By Order";
        BUTTON_SOURCE_CHECK_MATCH = "Check Match Result";
        LABEL_OUTPUT_FILE_TYPE = "Output File Type:";
        CHECKBOX_REPLACE_IMG_SUFFIX = "Replace Image Suffix";
        CHECKBOX_RUN_ACTION = "Execute Action:";
        CHECKBOX_NOT_CLOSE = "Do Not Close File";
        CHECKBOX_SET_FONT = "Font";
        CHECKBOX_SET_LEADING = "Leading";
        CHECKBOX_SET_TEXT_COLOR = "Text Color";
        CHECKBOX_SET_ANTI_ALIAS = "Anti-Alias";
        CHECKBOX_VERTICAL_ROMAN = "Vertical Roman";
        CHECKBOX_TATE_CHU_YOKO = "Tate-Chu-Yoko";
        CHECKBOX_TSUME = "Tsume";
        CHECKBOX_VERTICAL_ROMAN_CHARS = "Upright Chars (vertical)";
        CHECKBOX_KERNING_METRICS = "Metrics";
        TIP_TSUME = "Compresses the listed characters (e.g. 「」) by the given percentage; works with any font";
        TIP_KERNING_METRICS = "Uses the font's built-in kerning pairs (e.g. Latin AV); effect depends on the font";
        TIP_TYPO_NOTE = "Tsume is font-independent; Metrics uses font pairs; both on one char stack.";
        TIP_MATCH_BY_ORDER = "Match by order, not by filename: pair selected images with files in the source folder sequentially";
        TIP_REPLACE_SUFFIX = "Replace the extension in filenames before looking up source files (e.g. LP says .png but sources are .psd)";
        TIP_CHECK_MATCH = "Preview the matched source file for every image in a log window";
        TIP_OVERLAY_MANUAL = "Folder of pre-made overlay (whitening) images, matched by filename; unmatched pages are skipped";
        TIP_OUTPUT_LABEL_INDEX = "Also export the label index as a text layer next to each label";
        TIP_NO_LAYER_GROUP = "Keep text layers at top level instead of creating a group folder for them";
        TIP_SET_PPI = "Override the output document resolution with the given PPI";
        TIP_TEMPLATE_AUTO = "Auto-match a preset template in the ps_script_res folder by image filename";
        TIP_TEMPLATE_CUSTOM = "Use the specified PSD/TIF file as the import template";
        TIP_TEXT_DIRECTION = "Text direction for imported labels; \"Default\" keeps the template/original setting";
        TIP_VERTICAL_ROMAN = "Apply standard vertical roman alignment to vertical text; horizontal text is unaffected (on by default)";
        TIP_TEXT_LEADING = "Set auto leading as a percentage of font size (e.g. 120%)";
        TIP_TATE_CHU_YOKO = "In vertical text, matched strings (e.g. !!, !?; separated by |) render horizontally within one character width";
        TIP_TSUME_CHARS = "Characters to compress (e.g. 「」); each listed character is affected";
        TIP_TSUME_PERCENT = "Compression ratio 10-90; lower squeezes punctuation tighter";
        TIP_VERTICAL_ROMAN_CHARS = "In vertical text, apply standard upright treatment to the listed characters (default ?!); per-character version of standard vertical roman alignment";
        TIP_TEXT_REPLACE = "Replace label text on import using A->B|C->D expressions; separate rules with |";
        TIP_TEXT_REPLACE_PRESET = "Fill in common punctuation conversion examples";
        TIP_DIALOG_OVERLAY = "Auto-generate an overlay (whitening) layer for the specified groups; experimental";
        TIP_OVERLAY_TOLERANCE = "Tolerance for overlay detection; higher covers more area";

        CHECKBOX_WIDTH_CONVERT = "Full/Half Width";
        LABEL_WIDTH_DIGITS = "Digits";
        LABEL_WIDTH_LETTERS = "Letters";
        LABEL_WIDTH_SYMBOLS = "Symbols";
        LIST_WIDTH_CONVERT_ITEMS = [ "None", "Full→Half", "Half→Full" ];
        TIP_WIDTH_CONVERT = "When checked, converts character width per category and direction: Digits / Letters / Symbols (incl. space) each choose \"Full→Half\" or \"Half→Full\"; one-way only, characters already at the target width are left as-is. Runs before Text Replace";
        CHECKBOX_HAN_CONVERT = "Han Convert";
        LIST_HAN_CONVERT_ITEMS = [ "None", "Simp → Trad", "Trad → Simp" ];
        BUTTON_HAN_DATA = "Data…";
        TIP_HAN_CONVERT = "Conversion runs only when the box is checked AND a direction is chosen below. The data is not bundled — click \"Data…\" to download it; importing stops while it is missing";
        TIP_HAN_DATA_BTN = "View, download, re-download or remove the Han conversion data (from the official OpenCC repository, stored in your user config folder)";
        BUTTON_RULE_FILE = "File…";
        TIP_RULE_FILE = "Choose a replacement-rule file (.txt / .yml). txt: one A->B per line (| also works); yml: \"source: target\" lines or \"- A->B\" list items. Applies together with the text box when \"Text Replace\" is checked; the text box wins for the same source";
        ERROR_RULE_FILE_NOT_FOUND = "Replacement rule file not found or unreadable: ";

        DLG_HAN_TITLE = "Han Conversion Data";
        HAN_INTRO = "The conversion data is not bundled with this script; download it from the official OpenCC repository (Apache-2.0).";
        PANEL_HAN_STATUS = "Data Status";
        HAN_ROW_S2T = "Simp → Trad:";
        HAN_ROW_T2S = "Trad → Simp:";
        HAN_STATUS_INSTALLED = "Installed";
        HAN_STATUS_NOT_INSTALLED = "Not installed";
        HAN_SAVED_AT = "Location: ";
        BUTTON_HAN_DOWNLOAD = "Download";
        BUTTON_HAN_REDOWNLOAD = "Re-download";
        BUTTON_HAN_REMOVE = "Remove";
        TIP_HAN_DL_BTN = "Download this direction's dictionaries from GitHub and parse them into a local cache (needs internet)";
        TIP_HAN_RM_BTN = "Delete the local cache (same as uninstalling); download again before using this direction";
        HAN_DL_DOWNLOADING = "Downloading ";
        HAN_DL_PARSING = "Parsing dictionaries...";
        HAN_DL_WRITING = "Writing cache...";
        HAN_DL_DONE = "Done: installed ";
        HAN_DL_CANCELLED = "Download cancelled";
        HAN_DL_CANCEL_HINT = " (ESC to cancel)";
        HAN_REMOVE_CONFIRM = "Delete the conversion data for this direction? You will need to download it again.";
        HAN_REMOVED = "Removed";
        PANEL_HAN_NOTE = "Notes";
        HAN_NEED_DOWNLOAD_CONFIRM = "No conversion data is installed for this direction (Simp → Trad ≈ 1.0 MB / Trad → Simp ≈ 113 KB, needs internet access to GitHub). Open the data dialog now?";
        HAN_NOTE = "• Size & network: Simp → Trad ≈ 1.0 MB, Trad → Simp ≈ 113 KB. Downloading needs access to GitHub (raw.githubusercontent.com) and may be slow or fail - just retry. Nothing else in this script goes online.\n" +
            "• Location: user config folder labelplus_script\\opencc (\"Remove\" uninstalls it). Dictionaries are parsed into a local cache and the raw files are deleted.\n" +
            "• Accuracy: word choice follows OpenCC conventions (爲 / 裏 / 麪 / 臺), which may differ from everyday Taiwan/HK usage; ambiguous characters are resolved by the phrase table, isolated ones may still come out wrong. Use \"Text Replace\" rules for individual fixes (conversions run first, rules last).\n" +
            "• Missing glyphs: converted characters may not be covered by the current font (shown as boxes or wrong glyphs) - make sure the font contains them before laying out.\n" +
            "• Source: OpenCC ver.1.4.2 (github.com/BYVoid/OpenCC), Apache-2.0.";
        ERROR_HAN_DATA_NOT_INSTALLED = "Han conversion is selected but its data is not installed. Open the \"Data…\" dialog on the Automation tab and download it before importing.";
        ERROR_HAN_PRELOAD_FAILED = "Failed to read the Han conversion data (the cache may be corrupted); it has been deleted. Please download it again from \"Data…\".";
        ERROR_HAN_DOWNLOAD_FAILED = "Failed to download the Han conversion data. Please retry (click Download again); if it keeps failing, check that your network can reach GitHub (raw.githubusercontent.com).";
        ERROR_HAN_DL_VERIFY_FAILED = "Download verification failed (unexpected file size) - the transfer was probably truncated. Please download again.";
        ERROR_HAN_PARSE_FAILED = "Failed to parse the Han conversion data. Please download it again.";
        ERROR_HAN_CACHE_WRITE_FAILED = "Failed to write the Han conversion cache. Check disk space and folder permissions.";
        CHECKBOX_SET_PPI = "Set PPI";
        LABEL_TEXT_DIRECTION = "Text Direction:";
        LIST_TEXT_DIT_ITEMS = [ "Default", "Horizontal", "Vertical" ];
        CHECKBOX_NO_LAYER_GROUP = "Layer Not Grouping";
        BUTTON_TEXT_REPLACE_PRESET = "Punctuation";
        BUTTON_HELP = "Help";
        BUTTON_CLOSE = "Close";
        HELP_TITLE = "Help / About";
        HELP_NOTE = "A modded build for the 九九组 group — everyone is welcome.";
        HELP_HINT = "Click any line below to open it in your browser:";
        PANEL_HELP_LINKS = "Links";
        PANEL_HELP_ABOUT = "Version Info";
        HELP_LINK_DOCS = "Usage Guide";
        HELP_LINK_VIDEO = "Bilibili Installation Tutorial";
        HELP_LINK_PROJECT = "Project";
        HELP_VERSION_CHECKING = "Checking for updates...";
        HELP_VERSION_FAILED = "Update check failed (click to retry)";
        HELP_VERSION_RECHECK_TIP = "Click this line to check again";
        HELP_VERSION_LATEST = "You are up to date";
        HELP_VERSION_NEW = "New version available";
        HELP_VERSION_CLICK = " (click to download)";
        HINT_ESC_STOP = "Press ESC during import to abort";
        HELP_RUN_ACTION = "The action set may contain these actions (missing ones are skipped):\n\n" +
            "  _start — before each image\n" +
            "  [group name] — after each label (e.g. group1, group2)\n" +
            "  _end — after each image\n\n" +
            "Create/rename them in the PS Actions panel.";
        PROGRESS_PREPARING = "Preparing...";
        PROGRESS_PROCESSING = "Processing: ";
        CHECKBOX_DIALOG_OVERLAY = "Execute \"Dialog Overlay\"";
        LABEL_DIALOG_OVERLAY_GROUP = "Specified Groups(like: group1,group2)：";
        LABEL_DIALOG_OVERLAY_TOLERANCE = "Tolerance:";
        COMPLETE = "Export completed!";
        COMPLETE_WITH_ERROR = "Export Completed, but some error occured..."
        COMPLETE_FAILED = "Exported failed..."
        ERROR_UNEXPECTED = "Unexpected error, please contact with maintenance...";
        ERROR_FILE_OPEN_FAIL = "open file failed, please confirm whether Photoshop can open the file.";
        ERROR_FILE_SAVE_FAIL = "File saving failed, please check whether you have disk operation permission and whether the disk space is sufficient.";
        ERROR_NOT_FOUND_SOURCE = "Image Source Folder Not Found!";
        ERROR_NOT_FOUND_OVERLAY = "Overlay Folder Not Found!";
        ERROR_NOT_FOUND_TARGET = "Output PSD Folder Not Found!";
        ERROR_NOT_FOUND_LPTEXT = "LabelPlus Text File Not Found!";
        ERROR_NOT_FOUND_TEMPLATE = "Photoshop template file not found!";
        ERROR_CREATE_NEW_FOLDER = "Could not build new folder";
        ERROR_PARSER_LPTEXT_FAIL = "Fail To Load LabelPlus Text File";
        ERROR_NO_IMG_CHOOSED = "Please select more than one image";
        ERROR_NO_LABEL_GROUP_CHOOSED = "Please select more than one group";
        ERROR_NO_MATCH_IMG = "No matched image file!!!!";
        ERROR_HAVE_NO_MATCH_IMG = "Some image files did not match, please check again."
        ERROR_PRESET_TEMPLATE_NOT_FOUND = "Cannot match template file, please make sure \"ps_script_res\" folder exsit.";
        ERROR_TEXT_REPLACE_EXPRESSION = "Expression of text replacing is wrong, please check again.";
        ERROR_OPT_FONT_NOT_FOUND = "Cannot found the font";
    }
}
