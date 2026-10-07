# LabelPlus PS-Script（魔改版）

![img](pic.jpg)

> ## ⚠️ 请注意：这是个人魔改版
>
> - 本仓库基于官方 [LabelPlus/PS-Script](https://github.com/LabelPlus/PS-Script) 修改而来，**增删了大量功能**
> - **bug 可能很多**，稳定性不作保证，请勿用于关键生产环境
> - **建议优先使用官方版**：<https://github.com/LabelPlus/PS-Script>
> - 只有当官方版满足不了你的需求时，再来试试本魔改版
>
> 本版本为九九组特供魔改版，也欢迎大家使用。

## 概述

LabelPlus 是一个用于图片翻译的工具包，本工程是其中的 Photoshop 文本导入工具：读入 LabelPlus 翻译文本（`.txt`/`.json`），将文本逐条创建为 PSD 中的文本图层，再按需导出。

## 魔改版主要特色（相对官方版）

- **帮助页**：B站安装教程 / 使用教程网页 / 项目地址一键直达，内置版本更新检测
- **导入性能大幅优化**：批量导入实测提速约 2.3 倍
- 每张图片处理后自动清理 PS 缓存，避免大批量导入时内存持续增长
- 导入进度窗口 + **ESC 随时中止**（不残留半成品）
- 支持按图源后缀自动匹配 / 按顺序匹配图片文件
- 支持设置输出 PPI、文字颜色、消除锯齿、标准垂直罗马对齐
- 动作组兼容性增强：分组文件夹自动预建、不存在的动作自动跳过
- 文本替换规则（如标点自动转换），支持从外部规则文件（txt / yml）读取，与文本框规则合并、同一「源」以文本框为准；内置全角↔半角、简→繁 / 繁→简转换（简繁字典需在「数据…」中自行从 OpenCC 官方下载，脚本本身不含字典数据）
- 对话框自动涂白及容差设置（实验功能）
- 更多细节见 [CHANGELOG.md](CHANGELOG.md)

## 文本替换规则文件（txt / yml）

自动化页「文本替换」右侧的「文件…」按钮可以选择一个外部规则文件（`.txt` / `.yml` / `.yaml`，UTF-8 编码）。**勾选「文本替换」后**，文件规则与文本框中的表达式合并生效：

1. 先执行文件里的规则（按文件内从上到下的顺序）；
2. 与文本框**同一「源」**的文件规则会被丢弃（以文本框为准）；
3. 最后执行文本框里的规则，可用来修正文件规则的结果。

> 整体执行顺序：内置转换（全角↔半角 → 简→繁 / 繁→简）→ 规则文件 → 文本框规则。

### txt 格式

每行一条 `源->替换`；也支持一行内用 `|` 分隔多条；空行忽略：

```text
?->？
!->！
!!->！！
~->～|～->~
```

### yml 格式

支持两种简单写法（是精简子集，不支持嵌套等完整 YAML 语法）：

```yaml
# 写法一：映射行「源: 替换」
？: ！
！: ？
「: 『
」: 』
台湾: 台灣  # 支持行内注释（# 前需有空白，同 YAML 规则）

# 写法二：列表项「- 源->替换」
- 臺灣->台灣
- 麪條->麵條
```

- `#` 开头的整行会忽略；yml 中还支持行内注释（空白后跟 `#` 起，同 YAML 规则），txt 文件里 `#` 是普通字符；
- 源 / 替换两侧成对的 `"` 或 `'` 会被去除，方便写引号类规则，如 `'"': "“"`；
- 行的值为空（如 `rules:` 这类小节标题）会被自动跳过；
- 文件不存在或读不出时，导入会中止并提示——建议把规则文件放进作品文件夹，方便组内共享。

## 下载 / 教程 / 反馈

- **发布下载页（最新版在此下载）**：<https://github.com/xiaobailoves/PS-Script/releases>
- B站安装教程视频：<https://www.bilibili.com/video/BV1tTg46UESb/>
- 使用教程网页：<https://www.yurucamp.cn/archives/9/>
- 问题反馈：<https://github.com/xiaobailoves/PS-Script/issues>

## 安装

1. 从 [Releases](https://github.com/xiaobailoves/PS-Script/releases) 下载最新的 zip
2. 解压后，把 `LabelPlus_Ps_Script.jsx` 和 `ps_script_res` 文件夹放进 Photoshop 的 `Presets\Scripts\` 目录
3. 重启 Photoshop，通过 文件 → 脚本 运行（详细步骤见上方 B站安装教程）

## 开发方法

### requirement

* nodejs + npm（或 yarn）
* python（`flatten_jsx.py` / `pack_zip.py` 需要）

```
$ npm install
# 国内网络可配置镜像:
# npm config set registry https://registry.npmmirror.com
```

### build

```
$ ./build.sh
# 产物: build/LabelPlus_Ps_Script.jsx + build/ps_script_res
```

推送 `vX.Y.Z` 格式的 tag 后，GitHub Actions 会自动构建并创建 Release（见 `.github/workflows/release.yml`）。

## 开源与致谢

脚本用到的开源项目：

* [xtools(BSD license)](http://ps-scripts.sourceforge.net/xtools.html) 中部分工具函数及 UI 框架
* [JSON Action Manager](http://www.tonton-pixel.com/json-photoshop-scripting/json-action-manager/index.html) 中的 JSON 解析库

本工程遵循原项目许可（GPL），详见 [LICENSE.txt](LICENSE.txt)。感谢官方 LabelPlus 及所有贡献者。
