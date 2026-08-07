# Habit Check-in

Check in habits from the right sidebar with one click, track streaks and yearly heatmaps, and embed habit heatmaps into any note.

## Features

- **One-click check-in** from the right sidebar — click again to undo
- **Calendar integration** — dots on checked days; click a date to switch the check-in date
- **Three input modes**: fixed step, manual amount, timer (stopwatch / countdown)
- **Intensity levels** with 6 preset color palettes
- **Stats**: current streak, longest streak, monthly completion, total check-ins
- **Yearly heatmap** (GitHub style): full year / 3 months / current month
- **Embed** any habit's heatmap into a note
- **Light & dark theme** support via Obsidian CSS variables

## Installation

### Option 1: BRAT (recommended for testing)

1. Install the [BRAT](obsidian://show-plugin?id=obsidian42-brat) community plugin.
2. Command palette → `BRAT: Add a beta plugin for testing` → paste `https://github.com/NotStudyToday/obsidian-habit-check-in`.
3. Enable **Habit Check-in** in Settings → Community plugins.

### Option 2: Manual

1. Download the latest [release](https://github.com/NotStudyToday/obsidian-habit-check-in/releases).
2. Unzip and place the `habit-checkin` folder into `<your-vault>/.obsidian/plugins/`.
3. Reload Obsidian and enable **Habit Check-in** in Settings → Community plugins.

## Usage

### Create a habit

Settings → Habit Check-in → **+ New habit**. Configure:

- Name, emoji icon, color.
- Start/end date (or "ongoing"), weekly plan (e.g. Mon/Wed/Fri).
- Daily target, step size, unit.
- **Intensity levels**: colored by count ranges, with one-click preset palettes.
- Input mode: fixed / manual / timer.

### Right-sidebar check-in

- Click the `check-square` icon in the left ribbon to open the today view.
- Switch the date to backfill check-ins; the header shows daily progress.
- Timer habits: stopwatch — "Start / Stop"; countdown — enter minutes, auto-records when finished.

### Main view

Click the `calendar-check` icon in the left ribbon to see each habit's yearly heatmap and stats.

### Embed in notes

In the settings page, click the copy icon on a habit row, then paste into any note:

````markdown
```habit-heatmap
habitId=xxxxxxxx
```
````

Optional parameters:

| Parameter | Values | Description |
|-----------|--------|-------------|
| `habitId` | habit id | `all` or omitted for all habits |
| `range` | `year` / `3m` / `month` | full year (default) / 3 months / current month |

### Calendar integration

- Checked days show dots in the Calendar plugin (level-colored for intensity habits).
- Clicking a date in Calendar switches the right-sidebar view to that date.

## Data storage

Check-in data is stored in `<your-vault>/.obsidian/plugins/habit-checkin/data.json` (created automatically on first use). Back it up by copying this file.

## Development

Single-file vanilla JS, no build step. Edit `main.js` / `styles.css` / `manifest.json`, then reload the plugin in Obsidian.

## 中文简介

习惯打卡插件：右侧栏一键打卡、固定/手动/计时器三种打卡方式、强度分级配色、年热力图、连续打卡统计、与 Calendar 联动、笔记内嵌。安装与使用方式同上方英文说明。

## License

MIT
