<p align="center">🌐 <strong>English</strong> &nbsp;·&nbsp; <a href="README.md"><strong>中文</strong></a></p>

---

# Habit Check-in

> An Obsidian plugin: **one-click check-in** from the right sidebar, supporting **single / goal / timer** check-in modes, with **GitHub-style heatmaps**, **intensity-level colors**, **Calendar plugin integration**, and **embeddable heatmaps** in any note.

![Main page](main-page.png)

## ✨ Features

### 1. Multiple check-in modes

**① Single check-in**
Set a daily check-in item; click the button to toggle between *checked* / *unchecked*.

![Single check-in](checkin-single.gif)

**② Goal check-in**
Set a daily goal, e.g. *"drink 1000 ml of water every day"*. Customize the amount added per check-in and click **+** to accumulate, or manually enter a single amount.

![Goal check-in](checkin-target.gif)

**③ Timer check-in**
Supports **count-up** (stopwatch) and **countdown** modes. For countdown you can set a custom duration (e.g. 45 minutes); click **Start** to begin, and the elapsed time is auto-recorded when it ends.

![Timer check-in](checkin-timer.gif)

### 2. Calendar plugin integration

After a check-in, the date is automatically marked with a dot in the Calendar plugin — at a glance.

![Calendar integration](calendar-link.png)

### 3. Intensity-level colors

Add your own intensity levels, each with a value range and color; the heatmap is color-coded by intensity automatically. With levels enabled, the **daily goal** stays customizable (it defaults to the highest level); completion is judged against your goal, and levels only drive the heatmap color depth.

![Intensity levels](intensity-levels.png)

## 📦 Installation

> Prerequisite: Obsidian **1.2.0** or later.

### Option 1: Community marketplace (recommended, easiest)

1. Open Obsidian → Settings ⚙️ → **Community plugins**
2. Turn off **Restricted mode** (if enabled), then click **Browse**
3. Search for **`Habit Check-in`**
4. Click **Install**, then **enable** it in the *Installed plugins* list
5. (Optional) Click the ⚙️ icon next to the plugin name to open its settings

### Option 2: BRAT (early access to new versions)

For users who want to try new features as soon as they ship.

1. Install the community plugin [BRAT](obsidian://show-plugin?id=obsidian42-brat)
2. Command palette (Ctrl/Cmd + P) → `BRAT: Add a beta plugin for testing`
3. Paste the repo URL: `https://github.com/NotStudyToday/obsidian-habit-check-in`
4. Back in the Community plugins list, enable **Habit Check-in**

### Option 3: Manual install

1. Download the latest version from GitHub [Releases](https://github.com/NotStudyToday/obsidian-habit-check-in/releases)
2. Unzip to get the `habit-checkin` folder (containing `main.js`, `manifest.json`, `styles.css`)
3. Place the folder into `.obsidian/plugins/` in your vault root
4. Restart Obsidian (or press Ctrl/Cmd + R to reload), then enable it in Community plugins

## 🚀 Usage

### Create a habit

1. Settings → **Habit Check-in** → **+ New habit**

![Create habit](create-habit-1.png)

2. Fill in the basic info: **name**, **icon** (Emoji supported), **check-in mode**, **amount per check-in**, etc.

![Basic info](create-habit-2.png)

3. For intensity levels: toggle on **Intensity levels** and set the **level**, **value**, and **color** for each.

![Intensity settings](create-habit-3.png)

4. Click **Save** and you're done — check in from the **right sidebar** from now on.

![Check-in view](create-habit-4.png)

### View statistics

Click the **calendar icon** in the left ribbon to open the main view, showing each habit's **yearly heatmap** and **streak statistics**. The heatmap supports **full year / 3 months / current month**.

### Backfill a missed day

Forgot to check in? Switch the **date to a past day** at the top of the right sidebar and backfill that day's check-in.

## 📝 Embed a heatmap into a note

Click the **copy icon** on a habit row in the settings page, then paste the code block into any note:

````markdown
```habit-heatmap
habitId=xxxxxxxx
```
````

| Param | Values | Description |
|-------|--------|-------------|
| `habitId` | habit id / `all` | `all` or omitted = all habits |
| `range` | `year` / `3m` / `month` | full year (default) / 3 months / current month |

Embedded heatmaps stay **in sync with your check-ins** in real time. On narrow widths the full-year view **centers on the current month** by default, and supports a **horizontal scrollbar** and **drag-to-pan**.

## 💾 Data storage

- **Habits / settings / timers**: stored in `.obsidian/plugins/habit-checkin/data.json`
- **Check-in records**: split into per-day files under `records/YYYY-MM-DD.json` (one file per day)

Storing records in per-day files makes cross-device sync (Obsidian Sync / Synology Drive / iCloud, etc.) safer — a sync conflict only affects a single small day file instead of the whole dataset. Back up your vault or simply copy the whole `habit-checkin` plugin folder. **Running timers are saved automatically when you close Obsidian** and settle automatically on next launch — nothing is lost.

## ❓ FAQ

- **Can't find the plugin?** Make sure Obsidian ≥ 1.2.0 and that it's enabled in the *Installed plugins* list.
- **Intensity colors not showing?** Toggle on **Intensity levels** when creating the habit, then save.
- **Found a bug or have a feature request?** Open an [Issue](https://github.com/NotStudyToday/obsidian-habit-check-in/issues) on GitHub ⭐

---

*Published on the Obsidian community marketplace 🎉 If you find it useful, give it a star on GitHub!*

## License

MIT
