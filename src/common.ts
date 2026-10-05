//@include "./xtools/xlib/stdlib.js";
/// <reference path="legacy.d.ts" />

namespace LabelPlus {

export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg ? "error: " + msg : "error: assert " + condition);
    }
}

// Operating System related
export let dirSeparator = $.os.search(/windows/i) === -1 ? '/' : '\\';

export const TEMPLATE_LAYER = {
    TEXT:  "text",
    IMAGE: "bg",
    DIALOG_OVERLAY: "dialog-overlay",
    OVERLAY_MANUAL: "overlay-manual",
};

// 帮助页链接
export const PROJECT_URL = "https://github.com/xiaobailoves/PS-Script";
export const RELEASE_URL = PROJECT_URL + "/releases";
export const ISSUES_URL  = PROJECT_URL + "/issues";
export const VIDEO_URL   = "https://www.bilibili.com/video/BV1tTg46UESb/";
export const DOCS_URL    = "https://www.yurucamp.cn/archives/9/";

// ---------------- 界面样式助手（ScriptUI 可用的美化手段，不支持时静默跳过） ----------------

// 加粗文字（可选字号）
export function styleBold(t: any, size?: number) {
    try {
        /// @ts-ignore
        t.graphics.font = ScriptUI.newFont("dialog", "BOLD", size || 12);
    } catch (e) { }
}

// 弱化说明文字（灰色）
export function styleDim(t: any) {
    try {
        /// @ts-ignore
        t.graphics.foregroundColor = t.graphics.newPen(t.graphics.PenType.SOLID_COLOR, [0.45, 0.45, 0.45, 1], 1);
    } catch (e) { }
}

// 链接样式（蓝色）
export function styleLink(t: any) {
    try {
        /// @ts-ignore
        t.graphics.foregroundColor = t.graphics.newPen(t.graphics.PenType.SOLID_COLOR, [0.1, 0.35, 0.75, 1], 1);
    } catch (e) { }
}

// 面板/容器浅色底（Windows 若不支持则无效果）
export function stylePanelTint(pnl: any) {
    try {
        /// @ts-ignore
        pnl.graphics.backgroundColor = pnl.graphics.newBrush(pnl.graphics.BrushType.SOLID_COLOR, [0.955, 0.965, 0.98, 1]);
    } catch (e) { }
}

// 用系统默认浏览器打开链接
export function openUrl(url: string) {
    try {
        if ((new File(url)).execute()) {
            return;
        }
    } catch (e) { }
    execCommandHidden('cmd /c start "" "' + url + '"');
}

// 隐藏窗口执行系统命令
// 注：app.system / File.execute 执行命令行程序会弹出 cmd 黑窗，
// 这里通过 wscript + VBScript 以隐藏窗口方式运行（wscript 自身无控制台）
function execCommandHidden(cmd: string): boolean {
    try {
        let vbsPath = Folder.temp.fsName + dirSeparator + "lp_ps_script_exec.vbs";
        let vbs = new File(vbsPath);
        if (vbs.open("w")) {
            vbs.lineFeed = "windows";
            vbs.write('On Error Resume Next\r\n');
            vbs.write('Set ws = CreateObject("WScript.Shell")\r\n');
            vbs.write('ws.Run "' + cmd.replace(/"/g, '""') + '", 0, True\r\n');
            vbs.write('CreateObject("Scripting.FileSystemObject").DeleteFile "' + vbsPath + '"\r\n');
            vbs.close();
            if ((new File(vbsPath)).execute()) {
                return true; // 异步执行，结果由调用方轮询
            }
        }
    } catch (e) {
        log("hidden exec failed: " + e);
    }
    return false;
}

// 读取 GitHub 最新 Release 的版本号；失败返回 null
export function fetchLatestReleaseTag(): string | null {
    try {
        let outPath = APP_DATA_FOLDER + dirSeparator + "lp_ps_script_update.json";
        let out = new File(outPath);
        if (out.exists) {
            out.remove();
        }
        let url = "https://api.github.com/repos/xiaobailoves/PS-Script/releases/latest";
        execCommandHidden('curl -s -L --max-time 4 -o "' + outPath + '" "' + url + '"');
        // File.execute 是异步的；轮询等待文件生成（最多 5 秒）
        for (let i = 0; i < 25; i++) {
            if (out.exists) {
                break;
            }
            $.sleep(200);
        }
        if (!out.exists) {
            return null;
        }
        out.open("r");
        out.encoding = "UTF-8";
        let text = out.read();
        out.close();
        let data = jamJSON.parse(text);
        return (data && data.tag_name) ? String(data.tag_name) : null;
    } catch (e) {
        log("fetchLatestReleaseTag failed: " + e);
        return null;
    }
}

// 版本号比较：remote 是否比 local 新（如 1.7.9 > 1.7.8）
export function isVersionNewer(remote: string, local: string): boolean {
    let a = remote.replace(/^v/, "").split(".");
    let b = local.replace(/^v/, "").split(".");
    let n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
        let x = parseInt(a[i]) || 0;
        let y = parseInt(b[i]) || 0;
        if (x > y) return true;
        if (x < y) return false;
    }
    return false;
}

export const image_suffix_list = [".psd", ".png", ".jpg", ".jpeg", ".tif", ".tiff"];

export function GetScriptPath(): string {
    return <string>$.fileName;
}

export function GetScriptFolder(): string {
    return (new Folder(GetScriptPath())).path;
}

export function FileIsExists(path: string): boolean {
    return (new File(path)).exists;
}

export function FolderIsExists(path: string): boolean {
    return (new Folder(path)).exists;
}

export function Emit(func: Function): void {
    if (func !== undefined)
        func();
}

export function StringEndsWith(str: string, suffix: string) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

export function getImageFilesListOfPath(path: string): string[] {
    let folder = new Folder(path);
    if (!folder.exists) {
        return new Array<string>();
    }

    let fileList = folder.getFiles();
    let fileNameList = new Array();

    for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        if (file instanceof File) {
            let tmp = file.toString().split("/");
            let short_name = tmp[tmp.length - 1];
            for (let i = 0; i < image_suffix_list.length; i++) {
                if (StringEndsWith(short_name.toLowerCase(), image_suffix_list[i])) {
                    fileNameList.push(short_name);
                    break;
                }
            }
        }
    }

    return fileNameList.sort();
}

export function doAction(action: string, actionSet: string): boolean
{
    try {
        app.doAction(action, actionSet);
        return true;
    } catch (e) {
        log("doAction \"" + action + "\" in \"" + actionSet + "\" failed: " + e);
        return false;
    }
}

export function min(a: number, b: number): number {
    return (a < b) ? a : b;
}

export function delArrayElement<T>(arr: Array<T>, element: T) {
    let idx = arr.indexOf(element);
    if (idx >= 0) {
        arr.splice(idx, 1);
    }
}

let dataPath = Folder.appData.fsName + dirSeparator + "labelplus_script";
let dataFolder = new Folder(dataPath);
if (!dataFolder.exists) {
    if (!dataFolder.create()) {
        dataPath = Folder.temp.fsName;
    }
}
export const APP_DATA_FOLDER: string = dataPath;
export const DEFAULT_LOG_PATH: string = APP_DATA_FOLDER + dirSeparator + "lp_ps_script.log";
export const DEFAULT_INI_PATH: string = APP_DATA_FOLDER + dirSeparator + "lp_ps_script.ini";
export const DEFAULT_DUMP_PATH: string = APP_DATA_FOLDER + dirSeparator + "lp_ps_script.dump";
export let alllog: string = "";
export let errlog: string = "";

Stdlib.log.setFile(DEFAULT_LOG_PATH);
export function log(msg: any) { Stdlib.log(msg); alllog += msg + '\n'; }
export function log_err(msg: any) { Stdlib.log(msg); errlog += msg + '\n'; alllog += msg + '\n'; }
export function showdump(o: any) { alert(Stdlib.listProps(o)); }

export function str_filename_pair(file_orign: string, file_matched: string): string {
    return file_orign + "(" + file_matched + ")";
}

} // namespace LabelPlus
