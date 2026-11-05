# Habit Check-in 插件发布流程（AI 可读 SOP）

> 本文档是插件「习惯打卡 Habit Check-in」的**发布操作手册**，供任何 AI 助手（或人）在后续会话中照此执行。遇到"发版 / 发布 / 更新插件"的请求时，先读本文件，严格按流程走。

---

> **2026-11-05 路径更新**：发布源为 `F:\Project\tools\obsidian-habit-checkin`，本地运行副本为 `E:\Obsidian\.obsidian\plugins\habit-checkin`。旧 `F:\SynologyDrive` 目录是历史副本，不再作为开发或发布源。v0.1.7 包含预设项目、周／月灵活计划、设置卡片 UI 与升级数据保护。

## 一、项目结构（先搞清楚文件在哪）

| 目录                                                           | 用途                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `F:\Project\tools\obsidian-habit-checkin\`        | **Git 仓库 + 发布源**（唯一需要 commit/push/tag 的地方）                 |
| `E:\Obsidian\.obsidian\plugins\habit-checkin\` | Obsidian 里实际运行的插件副本（日常开发调试用）                               |
| GitHub 仓库                                                    | `https://github.com/NotStudyToday/obsidian-habit-check-in` |

**核心事实：**
- 本插件是**纯 JS 单文件**，**没有任何构建步骤**（不需要 `npm install` / `npm run build`），提交的文件本身就是发布产物。
- `main.js` 就是全部插件代码（约 2100 行）。
- 已经上架 Obsidian 官方社区插件市场，**发新版本不需要重新审核**，打 tag 后用户端自动收到更新。
- **数据存储**：习惯/设置/计时器存在 `data.json`；打卡记录**按天分文件**存在 `records/YYYY-MM-DD.json`（v0.1.5 起）。跨设备同步冲突只影响单个日期小文件，历史数据更安全。旧数据在启动时**自动迁移**（合并取大值、成功后清旧、失败保底重试），升级前先备份；备份或读取失败时停止加载。

---

## 二、仓库文件清单

| 文件 | 作用 |
|------|------|
| `main.js` | 插件全部逻辑（唯一的代码文件） |
| `manifest.json` | 插件元数据：`id`、`name`、`version`、`minAppVersion`、`description`、`author` |
| `styles.css` | 样式 |
| `versions.json` | 版本→最低 Obsidian 版本 兼容表（更新分发用，必须有新版本条目） |
| `README.md` | 中文说明（GitHub 首页默认显示中文） |
| `README-en.md` | 英文说明（顶部有中/英切换 Tab） |
| `assets/` | README 里的图片（**必须带 `assets/` 前缀引用**） |
| `.github/workflows/release.yml` | 打 tag 后自动构建 Release 并上传资产的 GitHub Actions |
| `.gitignore` | 已忽略 `data.json`、`records/` 与 `backups/`（用户打卡数据，**绝不入库**） |

---

## 三、日常开发（改代码）

1. 直接在 vault 插件目录改：`E:\Obsidian\.obsidian\plugins\habit-checkin\main.js`
   - 复制完代码后执行 `obsidian plugin:reload id=habit-checkin`，再检查设置页与视图。
2. 或在开发仓库改：`F:\Project\tools\obsidian-habit-checkin\main.js`
3. 注意：两个目录是**独立副本**，改了一边要记得同步到另一边再发布。

---

## 四、发布流程（发新版本，严格按顺序）

### Step 1：确定版本号
- 看 `manifest.json` 当前 `version`，新版本号在其基础上前进一档。例：当前 `0.1.5` → 下一个 `0.1.6`。

### Step 2：同步代码到开发仓库
把最终版代码放到 `F:\Project\tools\obsidian-habit-checkin\` 根目录：
- 若代码改在 vault 插件目录：复制 `.obsidian\plugins\habit-checkin\main.js`（和 `styles.css`）过来。
- 覆盖到开发仓库的 `main.js`、`styles.css`。
- **只复制代码文件，不要复制 `records/`、`backups/` 或 `data.json`**（用户数据；仓库已 gitignore，复制进来会污染本地工作区）。

### Step 3：更新版本号（两处，缺一不可）
1. `manifest.json`：
   ```json
   "version": "0.1.6"
   ```
2. `versions.json` 增加一行：
   ```json
   "0.1.6": "1.2.0"
   ```
   （`minAppVersion` 保持 `1.2.0`，除非新功能明确需要更高 Obsidian 版本。）

### Step 4：语法与回归检查（必须执行）
```bash
node --check "F:/Project/tools/obsidian-habit-checkin/main.js"
node --test "F:/Project/tools/obsidian-habit-checkin/tests/habits.test.js"
```
输出无报错才算通过。

### Step 5：检查 README
- 所有图片引用**必须带 `assets/` 前缀**：`![xx](assets/xx.png)`，否则 GitHub 裂图。
- 中英文两版都要存在，顶部有语言切换链接。
- 若改过功能特性，记得同步更新 README 描述。

### Step 6：git 提交并推送
```bash
cd "F:/Project/tools/obsidian-habit-checkin"
git add -A
git commit -m "feat: 本次改动描述"
git push origin main
```

### Step 7：打 tag 触发发版（关键步骤）
```bash
git tag -a 0.1.6 -m "v0.1.6: 本次改动描述"
git push origin 0.1.6
```
> 打 tag 会触发 `.github/workflows/release.yml`：自动把 `main.js`、`manifest.json`、`styles.css` 打包成 GitHub Release 资产，Obsidian 用户端自动检测到更新。

### Step 8：验证发布结果
- 访问 `https://github.com/NotStudyToday/obsidian-habit-check-in/releases`，确认新版本已生成、含 3 个资产（`main.js` / `manifest.json` / `styles.css`）。
- 若网页访问不便（AI 环境常被网络策略限制），改用 **GitHub API** 验证（公开仓库免登录）：
  ```bash
  curl -s "https://api.github.com/repos/NotStudyToday/obsidian-habit-check-in/releases/tags/0.1.6"
  ```
  检查返回中的 `draft`（应为 `false`）、`published_at`、以及 `assets` 是否含 `main.js` / `manifest.json` / `styles.css` 三个资产、字节数与本地一致。
- Obsidian 市场页 `https://community.obsidian.md/plugins/habit-checkin` 会**延迟**自动同步（约几十分钟），新版本出现即成功。

---

## 五、常见坑（务必避免）

1. **绝不提交 `data.json`、`records/` 和 `backups/`** —— 那是用户打卡数据，`.gitignore` 已忽略，不要 `git add` 它们。
2. **tag 版本必须和 `manifest.json` 的 `version` 完全一致**（如 tag `0.1.6` ↔ manifest `0.1.6`），否则 Obsidian 更新校验失败。
3. **`versions.json` 必须同步加新版本条目**，漏掉会导致用户收不到更新。
4. **README 图片路径必须带 `assets/` 前缀**，去掉后 GitHub 全裂图。
5. **不要运行 npm / 构建工具**——本插件没有构建步骤，直接改 `main.js`。
6. **`minAppVersion` 不要乱改**，保持在 `1.2.0`。
7. 若改了 `manifest.json` 的 `description`，市场页的一句话简介会随 bot 同步更新。

---

## 六、给 AI 助手的注意事项

- 用户说"发布 / 发版 / 更新插件"时，= 执行上面 **Step 2 → Step 8**。
- 用户说"开发 / 改功能"时，去改 vault 插件目录的 `main.js`，**不要**直接改 release 仓库代码，除非用户明确要求。
- 修改 `main.js` 后**一定先 `node --check`** 再发布。
- 打 tag / push 是公开操作，动手前可以先跟用户确认版本号和提交信息。
- 不确定的地方（版本号、功能描述）问用户，不要自作主张。

---

## 七、版本记录

| 版本    | 日期         | 主要内容                                                                                                                              |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.7 | 2026-11-05 | 预设项目每天一次、每周／每月灵活目标；热力图保留逐日显示；统一设置卡片与弹窗布局，修复下拉框边框；首次升级备份、迁移中断与损坏文件保护，旧数据兼容回归检查 |
| 0.1.6 | 2026-08-27 | 分级习惯可**自定义每日目标**（不再固定为最高等级上限，分级只影响热力图颜色深浅）；修复笔记嵌入热力图需重启才显示的问题；嵌入热力图**默认居中当月**、新增**横向滚动条与拖拽平移**；i18n 与代码清理 |
| 0.1.5 | 2026-08-12 | 打卡记录改为**按天分文件存储**（`records/YYYY-MM-DD.json`），跨设备同步冲突只影响单日小文件、更安全；主视图热力图新增**全年/近三月/当月**范围切换；移动端 UI 优化（触屏热力图、响应式设置页）；已有数据启动自动迁移、零损失 |
| 0.1.4 | 2026-08-07 | 修复计时习惯崩溃导致打卡按钮消失；修复拖拽排序 off-by-one                                                                                                |
| 0.1.3 | 2026-08-07 | 新增中/英双语与设置页语言切换                                                                                                                   |
| 0.1.2 | 2026-08-07 | 新增 Release 自动构建工作流（GitHub Actions + 资产证明）                                                                                         |
| 0.1.1 | 2026-08-07 | 社区审核打磨（v0.1.1）                                                                                                                    |
| 0.1.0 | 2026-08-07 | 首个正式版本                                                                                                                            |

---

*维护人：纲宇（NotStudyToday） · 最后更新：2026-11-05 · 对应版本：0.1.7*
