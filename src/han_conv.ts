/// <reference path="legacy.d.ts" />
/// <reference path="custom_options.ts" />
/// <reference path="common.ts" />
/// <reference path="i18n.ts" />

namespace LabelPlus {

// ---------------- 简繁转换数据（OpenCC，用户自行下载；脚本本身不含任何字典数据） ----------------
// 数据流：用户点「下载」→ curl 从 OpenCC 官方仓库拉原始字典（pin tag）→ 脚本解析为紧凑缓存
//         （<APP_DATA_FOLDER>\opencc\cache_s2t.txt / cache_t2s.txt）→ 删除原始文件。
// 缓存保存全量词组表、不做剪枝：OpenCC 的冗余/恒等条目是"占位拦截器"，
// 剪掉会让「发现 → 髮現」这类常用词转错（实测错误率 2.9% → 17.1%）。

export const HAN_CONV_TAG = "ver.1.4.2";
export const HAN_CONV_TAG_DISPLAY = "v1.4.2";
export const HAN_CONV_BASE = "https://raw.githubusercontent.com/BYVoid/OpenCC/" + HAN_CONV_TAG + "/data/dictionary/";

interface HanFileSpec { name: string; bytes: number; }

// 每方向两个文件：单字表在前、词组表在后；bytes 为 pinned tag 的实测字节数，下载后做完整性校验
const HAN_CONV_FILES: { [k: number]: HanFileSpec[] } = {
    1 /* S2T */: [ { name: "STCharacters.txt", bytes: 36026 },
                   { name: "STPhrases.txt",    bytes: 1007834 } ],
    2 /* T2S */: [ { name: "TSCharacters.txt", bytes: 104516 },
                   { name: "TSPhrases.txt",    bytes: 8786 } ],
};

export interface HanDataInfo {
    tag: string;
    date: string;
    nc: number;
    np: number;
    bytes: number;
}

// 内存缓存（懒加载；未启用或未载入时转换原样返回）
let hanConvChars: { [k: string]: string } = {};
let hanConvPhrases: { [k: string]: string } = {};
let hanConvFirstChars: { [k: string]: boolean } = {};
let hanConvMaxLen: number = 0;
let hanConvCacheDir: number = -1;
let hanConvLoaded: boolean = false;

export function hanConvReset(): void {
    hanConvChars = {};
    hanConvPhrases = {};
    hanConvFirstChars = {};
    hanConvMaxLen = 0;
    hanConvCacheDir = -1;
    hanConvLoaded = false;
}

export function hanConvDataDir(): string {
    return APP_DATA_FOLDER + dirSeparator + "opencc";
}

function hanConvCachePath(dir: number): string {
    return hanConvDataDir() + dirSeparator + (dir === OptionHanConvert.S2T ? "cache_s2t.txt" : "cache_t2s.txt");
}

function hanConvEnsureDataDir(): boolean {
    let d = new Folder(hanConvDataDir());
    if (d.exists) {
        return true;
    }
    return d.create();
}

function hanConvDateStr(): string {
    let d = new Date();
    let pad = (n: number) => (n < 10 ? "0" : "") + n;
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

// 读取缓存首行元信息（不解析全表）；未安装或损坏返回 null
export function hanConvGetInfo(dir: number): HanDataInfo | null {
    let path = hanConvCachePath(dir);
    let f = new File(path);
    if (!f.exists) {
        return null;
    }
    let opened = false;
    try {
        if (!f.open("r", "TEXT", "????")) {
            return null;
        }
        opened = true;
        f.lineFeed = "unix";
        f.encoding = "UTF-8";
        let head = f.readln();
        if (!head) {
            return null;
        }
        let info: any = jamJSON.parse(head.replace(/^\uFEFF/, ""));
        if (!info || info.fmt !== 1 || info.dir !== dir) {
            return null;
        }
        try { f.close(); } catch (e) { }
        opened = false;
        let bytes = 0;
        try { bytes = (new File(path)).length; } catch (e) { }
        return { tag: info.tag, date: info.date, nc: info.nc, np: info.np, bytes: bytes };
    } catch (e) {
        log_err("hanConvGetInfo failed: " + e);
        return null;
    } finally {
        if (opened) {
            try { f.close(); } catch (e) { }
        }
    }
}

export function hanConvIsInstalled(dir: number): boolean {
    return hanConvGetInfo(dir) !== null;
}

// 解析 OpenCC 原始字典 txt → "键:值" 行数组；失败返回 null。
// 格式：UTF-8、LF；注释行 # 散布在任意位置（TSCharacters 有 900+ 行注释）；数据行恰好一个 TAB，
// 值列按空格分隔、取第 1 个候选（OpenCC 主候选）。注意不要过滤"键必须 1 码元"——单字表含代理对。
function hanConvParseDict(rawPath: string): string[] | null {
    let f = new File(rawPath);
    if (!f.open("r", "TEXT", "????")) {
        return null;
    }
    f.lineFeed = "unix";
    f.encoding = "UTF-8";
    let out: string[] = [];
    let first = true;
    let guard = 0;
    try {
        while (!f.eof) {
            guard++;
            if (guard > 300000) {
                break; // 防御：避免个别环境下 eof 判定异常导致死循环
            }
            let line = f.readln();
            if (!line) {
                continue;
            }
            if (first) {
                line = line.replace(/^\uFEFF/, "");
                first = false;
            }
            if (line.charAt(0) === "#") {
                continue;
            }
            let t = line.indexOf("\t");
            if (t < 0) {
                continue;
            }
            let key = line.substring(0, t);
            let val = line.substring(t + 1).split(" ")[0];
            if (key === "" || !val) {
                continue;
            }
            if (key.indexOf(":") >= 0 || val.indexOf(":") >= 0) {
                continue; // 格式护栏（实测不命中）
            }
            out.push(key + ":" + val);
        }
    } finally {
        try { f.close(); } catch (e) { }
    }
    return out;
}

// 单文件下载；成功返回 null，否则返回本地化错误文案。
// curl 一开始就会创建 .part，成功后 move /y 原子换名 —— 目标文件出现 == 下载完整，
// 因此绝不能轮询目标文件 exists 来判断进度（会读到半包）。
function hanConvDownloadOne(spec: HanFileSpec, offset: number, total: number,
        onProgress?: (loaded: number, total: number) => void,
        onStatus?: (msg: string) => void,
        shouldCancel?: () => boolean): string | null {
    if (onStatus) {
        onStatus(I18n.HAN_DL_DOWNLOADING + spec.name + "（" + Math.round(spec.bytes / 1024) + " KB）");
    }
    let targetPath = hanConvDataDir() + dirSeparator + spec.name;
    let partPath = targetPath + ".part";
    try { if ((new File(targetPath)).exists) { (new File(targetPath)).remove(); } } catch (e) { }
    try { if ((new File(partPath)).exists) { (new File(partPath)).remove(); } } catch (e) { }

    let cmd = 'cmd /c curl -f -s -L --connect-timeout 10 --max-time 90 -o "' + partPath + '" "' + HAN_CONV_BASE + spec.name + '"'
            + ' && move /y "' + partPath + '" "' + targetPath + '"';
    if (!execCommandHidden(cmd)) {
        log_err("hanConv: cannot start download");
        return I18n.ERROR_HAN_DOWNLOAD_FAILED;
    }

    let waited = 0;
    let idle = 0;
    let done = false;
    while (waited < 120000) {
        if (shouldCancel && shouldCancel()) {
            try { if ((new File(partPath)).exists) { (new File(partPath)).remove(); } } catch (e) { }
            return I18n.HAN_DL_CANCELLED;
        }
        if ((new File(targetPath)).exists) {
            done = true;
            break;
        }
        let p = new File(partPath);
        if (p.exists) {
            idle = 0;
            if (onProgress) {
                onProgress(offset + p.length, total);
            }
        } else {
            idle += 100;
            if (idle >= 20000) {
                break; // 20 秒连 .part 都没出现：连不上或 404，快速失败
            }
        }
        $.sleep(100);
        waited += 100;
    }
    if (!done || !(new File(targetPath)).exists) {
        try { if ((new File(partPath)).exists) { (new File(partPath)).remove(); } } catch (e) { }
        log_err("hanConv: download failed or timed out: " + HAN_CONV_BASE + spec.name);
        return I18n.ERROR_HAN_DOWNLOAD_FAILED;
    }
    let got = (new File(targetPath)).length;
    if (got !== spec.bytes) {
        try { (new File(targetPath)).remove(); } catch (e) { }
        log_err("hanConv: size mismatch " + spec.name + " got " + got + " expect " + spec.bytes);
        return I18n.ERROR_HAN_DL_VERIFY_FAILED;
    }
    if (onProgress) {
        onProgress(offset + spec.bytes, total);
    }
    return null;
}

// 写缓存：首行 JSON 元信息 + 每行一条 "键:值"（先写 .tmp 再替换，避免写一半留下半个缓存）
function hanConvWriteCache(dir: number, charLines: string[], phraseLines: string[]): boolean {
    let cachePath = hanConvCachePath(dir);
    let maxlen = 0;
    for (let i = 0; i < phraseLines.length; i++) {
        let p = phraseLines[i].indexOf(":");
        if (p > maxlen) {
            maxlen = p;
        }
    }
    let head = jamJSON.stringify({
        fmt: 1,
        tag: HAN_CONV_TAG,
        date: hanConvDateStr(),
        dir: dir,
        nc: charLines.length,
        np: phraseLines.length,
        maxlen: maxlen,
    });
    let content = head + "\n" + charLines.join("\n") + "\n" + phraseLines.join("\n") + "\n";

    let tmpPath = cachePath + ".tmp";
    let f = new File(tmpPath);
    if (!f.open("w", "TEXT", "????")) {
        return false;
    }
    f.lineFeed = "unix";
    f.encoding = "UTF-8";
    let ok = true;
    try {
        f.write(content);
    } catch (e) {
        ok = false;
        log_err("hanConvWriteCache write failed: " + e);
    }
    try { f.close(); } catch (e) { ok = false; }

    let tmp = new File(tmpPath);
    if (!ok) {
        try { tmp.remove(); } catch (e) { }
        return false;
    }
    let old = new File(cachePath);
    if (old.exists) {
        try { old.remove(); } catch (e) { log_err("hanConvWriteCache remove old failed: " + e); }
    }
    try {
        if (tmp.rename(cachePath)) {
            return true;
        }
    } catch (e) { log_err("hanConvWriteCache rename failed: " + e); }
    // 降级：rename 失败时直接写正式文件
    let f2 = new File(cachePath);
    if (!f2.open("w", "TEXT", "????")) {
        return false;
    }
    f2.lineFeed = "unix";
    f2.encoding = "UTF-8";
    let ok2 = true;
    try { f2.write(content); } catch (e) { ok2 = false; log_err("hanConvWriteCache fallback write failed: " + e); }
    try { f2.close(); } catch (e) { ok2 = false; }
    try { tmp.remove(); } catch (e) { }
    return ok2;
}

// 删除原始字典与 .part 残留
function hanConvCleanupTemp(dir: number): void {
    let specs = HAN_CONV_FILES[dir];
    if (!specs) {
        return;
    }
    for (let i = 0; i < specs.length; i++) {
        let p = hanConvDataDir() + dirSeparator + specs[i].name;
        try { if ((new File(p)).exists) { (new File(p)).remove(); } } catch (e) { }
        try { if ((new File(p + ".part")).exists) { (new File(p + ".part")).remove(); } } catch (e) { }
    }
}

// 下载 → 校验 → 解析 → 写缓存 → 清理；成功返回 null，否则返回本地化错误文案
export function hanConvInstall(dir: number,
        onProgress?: (loaded: number, total: number) => void,
        onStatus?: (msg: string) => void,
        shouldCancel?: () => boolean): string | null {
    let specs = HAN_CONV_FILES[dir];
    if (!specs) {
        return I18n.ERROR_HAN_DOWNLOAD_FAILED;
    }
    if (!hanConvEnsureDataDir()) {
        return I18n.ERROR_HAN_CACHE_WRITE_FAILED;
    }
    let total = 0;
    for (let i = 0; i < specs.length; i++) {
        total += specs[i].bytes;
    }

    // 1) 下载
    let offset = 0;
    for (let i = 0; i < specs.length; i++) {
        if (shouldCancel && shouldCancel()) {
            hanConvCleanupTemp(dir);
            return I18n.HAN_DL_CANCELLED;
        }
        let err = hanConvDownloadOne(specs[i], offset, total, onProgress, onStatus, shouldCancel);
        if (err !== null) {
            hanConvCleanupTemp(dir);
            return err;
        }
        offset += specs[i].bytes;
    }

    // 2) 解析
    if (onStatus) {
        onStatus(I18n.HAN_DL_PARSING);
    }
    let charLines: string[] | null = null;
    let phraseLines: string[] | null = null;
    for (let i = 0; i < specs.length; i++) {
        let parsed = hanConvParseDict(hanConvDataDir() + dirSeparator + specs[i].name);
        if (parsed === null) {
            hanConvCleanupTemp(dir);
            return I18n.ERROR_HAN_PARSE_FAILED;
        }
        if (i === 0) {
            charLines = parsed;
        } else {
            phraseLines = parsed;
        }
    }
    if (charLines === null || phraseLines === null || charLines.length === 0 || phraseLines.length === 0) {
        hanConvCleanupTemp(dir);
        return I18n.ERROR_HAN_PARSE_FAILED;
    }

    // 3) 写缓存
    if (onStatus) {
        onStatus(I18n.HAN_DL_WRITING);
    }
    if (!hanConvWriteCache(dir, charLines, phraseLines)) {
        hanConvCleanupTemp(dir);
        return I18n.ERROR_HAN_CACHE_WRITE_FAILED;
    }

    // 4) 清理原始文件；安装新数据后内存缓存失效
    hanConvCleanupTemp(dir);
    hanConvReset();
    return null;
}

// 删除缓存（等同卸载）+ 残留临时文件
export function hanConvRemove(dir: number): boolean {
    let removed = false;
    try {
        let f = new File(hanConvCachePath(dir));
        if (f.exists) {
            removed = f.remove();
        }
    } catch (e) {
        log_err("hanConvRemove failed: " + e);
    }
    hanConvCleanupTemp(dir);
    hanConvReset();
    return removed;
}

// 懒加载缓存建表；dir 变化时重载
function hanConvEnsureLoaded(dir: number): boolean {
    if (hanConvLoaded && hanConvCacheDir === dir) {
        return true;
    }
    hanConvReset();
    let t0 = (new Date()).getTime();
    let f = new File(hanConvCachePath(dir));
    if (!f.open("r", "TEXT", "????")) {
        return false;
    }
    f.lineFeed = "unix";
    f.encoding = "UTF-8";
    try {
        let head = f.readln();
        if (!head) {
            return false;
        }
        let info: any = jamJSON.parse(head.replace(/^\uFEFF/, ""));
        if (!info || info.fmt !== 1 || info.dir !== dir) {
            return false; // 缓存损坏或方向不符 → 调用方提示重新下载
        }
        let chars: { [k: string]: string } = {};
        let phrases: { [k: string]: string } = {};
        let first: { [k: string]: boolean } = {};
        let mx = 0;
        for (let i = 0; i < info.nc; i++) {
            let L = f.readln();
            let p = L.indexOf(":");
            if (p > 0) {
                chars[L.substring(0, p)] = L.substring(p + 1);
            }
        }
        for (let i = 0; i < info.np; i++) {
            let L = f.readln();
            let p = L.indexOf(":");
            if (p > 0) {
                let k = L.substring(0, p);
                phrases[k] = L.substring(p + 1);
                first[k.charAt(0)] = true;
                if (k.length > mx) {
                    mx = k.length;
                }
            }
        }
        if (mx < info.maxlen) {
            mx = info.maxlen; // 交叉校验：以实际数据为准
        }
        hanConvChars = chars;
        hanConvPhrases = phrases;
        hanConvFirstChars = first;
        hanConvMaxLen = mx;
        hanConvCacheDir = dir;
        hanConvLoaded = true;
        log("han_conv: " + info.tag + " dir=" + dir + " loaded in " + ((new Date()).getTime() - t0) + "ms, " + info.nc + " chars / " + info.np + " phrases");
        return true;
    } catch (e) {
        log_err("hanConvEnsureLoaded failed: " + e);
        hanConvReset();
        return false;
    } finally {
        try { f.close(); } catch (e) { }
    }
}

// 导入前预载；失败（缓存损坏/缺失）删除缓存并返回错误文案
export function hanConvPreload(dir: number): string | null {
    if (hanConvEnsureLoaded(dir)) {
        return null;
    }
    try {
        let f = new File(hanConvCachePath(dir));
        if (f.exists) {
            f.remove();
        }
    } catch (e) { }
    return I18n.ERROR_HAN_PRELOAD_FAILED;
}

// 文本转换：最长优先词组匹配 + 单字表回退（代理对感知）；未载入时原样返回
export function hanConvConvert(text: string, dir: number): string {
    if (!hanConvEnsureLoaded(dir)) {
        return text;
    }
    let out: string[] = [];
    let i = 0;
    let n = text.length;
    while (i < n) {
        let hit = false;
        let c0 = text.charAt(i);
        // 首字符优化：绝大多数位置首字符不是任何词组键的开头，直接跳过整个长窗循环
        if (hanConvFirstChars[c0] === true) {
            let maxL = hanConvMaxLen;
            if (n - i < maxL) {
                maxL = n - i;
            }
            for (let L = maxL; L >= 2; L--) {
                let v = hanConvPhrases[text.substr(i, L)];
                if (typeof v === "string") {
                    out.push(v);
                    i += L;
                    hit = true;
                    break;
                }
            }
        }
        if (hit) {
            continue;
        }
        // 单字（代理对感知：CJK 扩展 B 区字符占两个码元）
        let cc = text.charCodeAt(i);
        if (cc >= 0xD800 && cc <= 0xDBFF && i + 1 < n) {
            let c = text.substr(i, 2);
            let v2 = hanConvChars[c];
            out.push(typeof v2 === "string" ? v2 : c);
            i += 2;
        } else {
            let v1 = hanConvChars[c0];
            out.push(typeof v1 === "string" ? v1 : c0);
            i++;
        }
    }
    return out.join("");
}

}
