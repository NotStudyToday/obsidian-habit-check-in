'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const clone = value => JSON.parse(JSON.stringify(value));
const loggedErrors = [];
class PluginStub {
  async loadData() { return clone(this.meta || {}); }
  async saveData(data) { this.meta = clone(data); }
  registerView() {} registerEvent() {} addCommand() {} register() {}
  registerMarkdownCodeBlockProcessor() {} addSettingTab() {}
}
const context = vm.createContext({
  require: () => ({ Plugin: PluginStub, ItemView: class {}, Modal: class {}, Setting: class {}, PluginSettingTab: class {}, Notice: class {} }),
  module: { exports: {} }, console: { ...console, error: (...args) => loggedErrors.push(args) }, navigator: { language: 'zh' },
  document: { body: { classList: { add() {}, remove() {} } } },
  window: { localStorage: { getItem: () => 'zh' }, addEventListener() {}, removeEventListener() {} },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8') + '\nmodule.exports = {HabitCheckinPlugin, U, buildHeatmapCells, HabitFormModal};', context);
const { HabitCheckinPlugin, U, buildHeatmapCells, HabitFormModal } = context.module.exports;
const today = U.todayKey();
const choiceHabit = (overrides = {}) => ({ id: 'fitness', name: '健身', target: 1, step: 1, unit: '', inputMode: 'choice', choices: ['跑步', '羽毛球', '骑车'], scheduleMode: 'week', periodTarget: 3, weekly: [], ...overrides });

async function makePlugin(meta = {}, disk = new Map(), configure = () => {}) {
  const plugin = new HabitCheckinPlugin();
  plugin.meta = meta;
  plugin.manifest = { id: 'habit-checkin' };
  plugin._setupRibbonIcons = plugin._updateDotStyles = plugin._injectCalendarSource = () => {};
  plugin.app = { workspace: { on() {} }, vault: { configDir: '.obsidian', adapter: {
    exists: async key => disk.has(key), mkdir: async key => { disk.set(key, null); },
    list: async dir => ({ files: [...disk.keys()].filter(k => k.startsWith(dir + '/') && k.endsWith('.json')) }),
    read: async key => { if (!disk.has(key)) throw Error('missing'); return disk.get(key); },
    write: async (key, value) => { disk.set(key, value); }, remove: async key => { disk.delete(key); },
  } } };
  configure(plugin, plugin.app.vault.adapter);
  await plugin.onload();
  return { plugin, disk };
}

test('activity creation, repeat selection, editing, undo and reload count a date once', async () => {
  const { plugin, disk } = await makePlugin({ habits: [choiceHabit()] });
  await plugin.setChoice('fitness', today, '跑步');
  await plugin.setChoice('fitness', today, '跑步');
  await plugin.setChoice('fitness', today, '骑车');
  assert.equal(U.countOf('fitness', today, plugin.data.records), 1);
  assert.equal(U.choiceOf('fitness', today, plugin.data.records), '骑车');
  assert.equal(U.periodProgress(plugin.data.habits[0], plugin.data.records, today).done, 1);
  let restarted = (await makePlugin(plugin.meta, disk)).plugin;
  assert.equal(U.choiceOf('fitness', today, restarted.data.records), '骑车');
  await restarted.setChoice('fitness', today, null);
  restarted = (await makePlugin(restarted.meta, disk)).plugin;
  assert.equal(U.countOf('fitness', today, restarted.data.records), 0);
  assert.equal(U.periodProgress(restarted.data.habits[0], restarted.data.records, today).done, 0);
  await restarted.setChoice('fitness', today, '羽毛球');
  assert.equal(U.countOf('fitness', today, restarted.data.records), 1);
  assert.equal('records' in restarted.meta, false);
});

test('weekly boundaries span month/year changes and always run Monday–Sunday', () => {
  const h = choiceHabit({ weekly: [3] }); // stale weekday choices must be ignored
  assert.deepEqual(clone(U.periodBounds(h, '2026-01-01')), { start: '2025-12-29', end: '2026-01-04' });
  const records = { fitness: { '2025-12-28': 1, '2025-12-29': 1, '2026-01-01': { count: 1, choice: '跑步' }, '2026-01-04': 1, '2026-01-05': 1 } };
  assert.equal(U.periodProgress(h, records, '2026-01-01', '2026-01-04').done, 3);
  assert.equal(U.periodProgress(h, records, '2026-01-05', '2026-01-05').done, 1);
  assert.equal(U.isInPlan(h, '2026-01-01'), true);
});

test('monthly progress handles leap February, calendar months, undo and start/end limits', () => {
  const h = choiceHabit({ scheduleMode: 'month', periodTarget: 12, startDate: '2024-02-02', endDate: '2024-03-01' });
  assert.deepEqual(clone(U.periodBounds(h, '2024-02-28')), { start: '2024-02-01', end: '2024-02-29' });
  const records = { fitness: { '2024-02-01': 1, '2024-02-02': 1, '2024-02-20': { count: 0, updatedAt: 1 }, '2024-02-29': 1, '2024-03-01': 1, '2024-03-02': 1 } };
  assert.equal(U.periodProgress(h, records, '2024-02-28', '2024-02-28').done, 1);
  assert.equal(U.periodProgress(h, records, '2024-02-29', '2024-02-29').done, 2);
  assert.equal(U.periodProgress(h, records, '2024-03-02', '2024-03-02').done, 1);
});

test('daily defaults and specific weekday schedules retain their old behavior', () => {
  const h = choiceHabit({ scheduleMode: undefined, weekly: [] });
  assert.equal(U.isInPlan(h, '2026-11-02'), true);
  assert.equal(U.isInPlan(h, '2026-11-03'), true);
  h.weekly = [1, 3, 5];
  assert.equal(U.isInPlan(h, '2026-11-02'), true);
  assert.equal(U.isInPlan(h, '2026-11-03'), false);
});

test('invalid choices, invalid dates, future dates and out-of-plan dates are rejected', async () => {
  const { plugin } = await makePlugin({ habits: [choiceHabit({ startDate: today })] });
  for (const [key, choice] of [[today, '游泳'], ['2026-02-30', '跑步'], ['2999-01-01', '跑步'], ['2020-01-01', '跑步']]) {
    await plugin.setChoice('fitness', key, choice);
  }
  assert.equal(Object.keys(plugin.data.records).length, 0);
  await plugin.toggleCheckin('fitness', today, false);
  assert.equal(Object.keys(plugin.data.records).length, 0);
});

test('numeric records migrate/load unchanged alongside activity records', async () => {
  const { plugin, disk } = await makePlugin({ habits: [choiceHabit(), { id: 'water', target: 1000, step: 200, unit: 'ml' }], records: { water: { [today]: 400 } } });
  assert.equal(U.countOf('water', today, plugin.data.records), 400);
  await plugin.setChoice('fitness', today, '跑步');
  await plugin.toggleCheckin('water', today, false);
  const restarted = (await makePlugin(plugin.meta, disk)).plugin;
  assert.equal(U.countOf('water', today, restarted.data.records), 600);
  assert.equal(U.totalCheckins(restarted.data.habits[1], restarted.data.records), 600);
  assert.equal(U.totalCheckins(restarted.data.habits[0], restarted.data.records), 1);
});

test('refresh takes newer activity edits and undo without resurrecting older selections', async () => {
  const { plugin, disk } = await makePlugin({ habits: [choiceHabit()] });
  await plugin.setChoice('fitness', today, '跑步');
  const old = clone(plugin.data.records.fitness[today]);
  const fp = plugin.recordsDir + '/' + today + '.json';
  disk.set(fp, JSON.stringify({ fitness: { count: 1, choice: '骑车', updatedAt: old.updatedAt + 10 } }));
  await plugin.refreshRecords();
  assert.equal(U.choiceOf('fitness', today, plugin.data.records), '骑车');
  disk.set(fp, JSON.stringify({ fitness: { count: 0, choice: '', updatedAt: old.updatedAt + 20 } }));
  await plugin.refreshRecords();
  assert.equal(U.countOf('fitness', today, plugin.data.records), 0);
  disk.set(fp, JSON.stringify({ fitness: old }));
  await plugin.refreshRecords();
  assert.equal(U.countOf('fitness', today, plugin.data.records), 0);
});

test('a failed record write is surfaced, rolls back selection and can be retried', async () => {
  const { plugin } = await makePlugin({ habits: [choiceHabit()] });
  const adapter = plugin.app.vault.adapter;
  const write = adapter.write;
  adapter.write = async () => { throw Error('disk full'); };
  await assert.rejects(plugin.setChoice('fitness', today, '跑步'), /disk full/);
  assert.equal(U.countOf('fitness', today, plugin.data.records), 0);
  assert.equal(plugin._dirtyDays.has(today), true);
  adapter.write = write;
  await plugin.setChoice('fitness', today, '跑步');
  assert.equal(U.countOf('fitness', today, plugin.data.records), 1);
});

test('heatmap shows the actual activity on its date without filling the rest of the week', () => {
  const h = choiceHabit({ startDate: '2026-01-01' });
  const records = { fitness: { '2026-11-02': { count: 1, choice: '跑步', updatedAt: 1 } } };
  for (const firstDay of [0, 1]) {
    const map = buildHeatmapCells(new Date(2026, 10, 5), firstDay, [h], records, 5, 'month');
    const run = map.cells.find(c => c.key === '2026-11-02');
    assert.equal(run.level, 5);
    assert.match(run.title, /跑步/);
    assert.equal(map.cells.find(c => c.key === '2026-11-03').level, 0);
  }
});

test('form rejects missing activities and invalid weekly/monthly goals without changing settings', () => {
  const plugin = { data: { habits: [] }, saveData: async () => {}, emitDataChange() {} };
  const modal = new HabitFormModal(null, plugin);
  modal.close = () => {};
  const form = { name: '健身', inputMode: 'choice', choices: [], scheduleMode: 'week', periodTarget: 3 };
  modal.save(form);
  assert.equal(plugin.data.habits.length, 0);
  for (const target of [0, 8, 2.5, NaN]) {
    modal.save({ ...form, choices: ['跑步'], periodTarget: target });
    assert.equal(plugin.data.habits.length, 0);
  }
  modal.save({ ...form, choices: ['跑步'], scheduleMode: 'month', periodTarget: 32 });
  assert.equal(plugin.data.habits.length, 0);
  modal.save({ ...form, choices: ['跑步'], startDate: '2026-12-01', endDate: '2026-11-01' });
  assert.equal(plugin.data.habits.length, 0);
});

test('quantity/timer goals count completed dates once per period, not the accumulated amount', () => {
  const h = choiceHabit({ inputMode: 'timer', target: 30, unit: '分钟', scheduleMode: 'month' });
  const records = { fitness: { '2026-10-01': 90, '2026-10-02': 20, '2026-10-03': 30 } };
  assert.equal(U.periodProgress(h, records, '2026-10-15', '2026-10-15').done, 2);
});

const pluginRoot = '.obsidian/plugins/habit-checkin';
const originalDay = pluginRoot + '/records/2026-10-01.json';
const legacyMeta = () => ({
  habits: [
    { id: 'single', name: '阅读', target: 1, step: 1, unit: '', weekly: [1, 3, 5], inputMode: 'fixed', startDate: '2025-01-01', sort: 0, color: '#00aa00' },
    { id: 'water', name: '喝水', target: 1000, step: 200, unit: 'ml', weekly: [], inputMode: 'manual', levels: [{ max: 500, color: '#00bb00' }], sort: 1 },
    { id: 'timer', name: '学习', target: 45, step: 25, unit: '分钟', inputMode: 'timer', timerType: 'countdown', sort: 2 },
  ],
  settings: { language: 'zh', showStatTotal: false, unknownFutureOption: { preserve: true } },
  timers: { timer: { start: Date.now() + 600000, preset: 25 } },
  unknownRootField: { preserve: true },
});

test('0.1.6 habits, schedules, units, unknown settings and all daily file bytes survive upgrade/save/restart', async () => {
  const meta = legacyMeta();
  const bytes = '{\n  "single": 1, "water": 650.5, "timer": 45\n}';
  const disk = new Map([[pluginRoot + '/data.json', JSON.stringify(meta, null, 2)], [pluginRoot + '/records', null], [originalDay, bytes]]);
  const { plugin } = await makePlugin(meta, disk);
  assert.deepEqual(clone(plugin.data.habits), meta.habits);
  assert.deepEqual(clone(plugin.data.timers), meta.timers);
  assert.equal(plugin.data.habits[0].scheduleMode, undefined);
  assert.equal(disk.get(originalDay), bytes);
  plugin.data.settings.showLegend = false;
  await plugin.saveData(plugin.data);
  const restarted = (await makePlugin(plugin.meta, disk)).plugin;
  assert.deepEqual(clone(restarted.data.habits), meta.habits);
  assert.deepEqual(clone(restarted.data.settings.unknownFutureOption), { preserve: true });
  assert.deepEqual(clone(restarted.data.unknownRootField), { preserve: true });
  assert.deepEqual(clone(restarted.data.timers), meta.timers);
  assert.equal(U.countOf('water', '2026-10-01', restarted.data.records), 650.5);
  assert.equal(disk.get(originalDay), bytes);
});

test('first-upgrade backup stores original metadata and record bytes and is never overwritten', async () => {
  const meta = legacyMeta();
  const metaBytes = JSON.stringify(meta, null, 4);
  const dayBytes = '{ "single": 1, "water": 200.25 }';
  const disk = new Map([[pluginRoot + '/data.json', metaBytes], [pluginRoot + '/records', null], [originalDay, dayBytes]]);
  const { plugin } = await makePlugin(meta, disk);
  assert.equal(disk.get(plugin.backupDir + '/data.json'), metaBytes);
  assert.equal(disk.get(plugin.backupDir + '/records/2026-10-01.json'), dayBytes);
  assert.equal(disk.has(plugin.backupDir + '/complete.json'), true);
  disk.set(originalDay, '{"single":1,"water":800}');
  await makePlugin(meta, disk);
  assert.equal(disk.get(plugin.backupDir + '/records/2026-10-01.json'), dayBytes);
});

test('legacy migration merges higher counts without adding twice and preserves objects and unrelated habit values', async () => {
  const meta = legacyMeta();
  meta.records = { single: { '2026-10-01': 1 }, water: { '2026-10-01': 600.25 }, choice: { '2026-10-02': { count: 1, choice: '跑步', updatedAt: 123 } } };
  const disk = new Map([[pluginRoot + '/records', null], [originalDay, '{"water":800.5,"unrelated":9}']]);
  const { plugin } = await makePlugin(meta, disk);
  assert.equal(U.countOf('water', '2026-10-01', plugin.data.records), 800.5);
  assert.equal(U.countOf('unrelated', '2026-10-01', plugin.data.records), 9);
  assert.equal(U.choiceOf('choice', '2026-10-02', plugin.data.records), '跑步');
  assert.equal('records' in plugin.meta, false);
  const restarted = (await makePlugin(plugin.meta, disk)).plugin;
  assert.equal(U.countOf('water', '2026-10-01', restarted.data.records), 800.5);
});

test('failed backup stops before touching legacy metadata or daily files', async () => {
  const meta = { records: { single: { '2026-10-01': 1 } } };
  const disk = new Map([[pluginRoot + '/data.json', JSON.stringify(meta)]]);
  await assert.rejects(makePlugin(meta, disk, (p, a) => {
    a.write = async () => { throw Error('backup denied'); };
  }), /backup denied/);
  assert.equal(disk.get(pluginRoot + '/data.json'), JSON.stringify(meta));
  assert.equal(disk.has(originalDay), false);
  assert.equal([...disk.keys()].some(k => k.endsWith('/complete.json')), false);
});

test('corrupt existing daily file blocks migration without overwriting its bytes or old metadata', async () => {
  const meta = { records: { single: { '2026-10-01': 1 } } };
  const disk = new Map([[pluginRoot + '/data.json', JSON.stringify(meta)], [pluginRoot + '/records', null], [originalDay, '{broken-json']]);
  await assert.rejects(makePlugin(meta, disk), e => e.name === 'SyntaxError');
  assert.equal(disk.get(originalDay), '{broken-json');
  assert.equal(disk.get(pluginRoot + '/data.json'), JSON.stringify(meta));
});

test('interrupted migration keeps the original metadata and retries without duplicating counts', async () => {
  const meta = { habits: legacyMeta().habits, records: { single: { '2026-10-01': 1, '2026-10-02': 1 }, water: { '2026-10-01': 200.5 } } };
  const original = JSON.stringify(meta);
  const disk = new Map([[pluginRoot + '/data.json', original]]);
  let failed;
  await assert.rejects(makePlugin(meta, disk, (p, a) => {
    failed = p;
    const write = a.write;
    a.write = async (key, value) => {
      if (key === pluginRoot + '/records/2026-10-02.json') throw Error('disk interrupted');
      return write(key, value);
    };
  }), /disk interrupted/);
  assert.equal(disk.get(pluginRoot + '/data.json'), original);
  assert.deepEqual(clone(failed.meta.records), meta.records);
  const { plugin } = await makePlugin(meta, disk);
  assert.equal(U.totalCheckins(plugin.data.habits[0], plugin.data.records), 2);
  assert.equal(U.totalCheckins(plugin.data.habits[1], plugin.data.records), 200.5);
  assert.equal(disk.get(plugin.backupDir + '/data.json'), original);
});

test('metadata save failure during migration leaves the legacy records available for a safe retry', async () => {
  const meta = { records: { water: { '2026-10-01': 250 } } };
  let failed;
  const disk = new Map();
  await assert.rejects(makePlugin(meta, disk, p => {
    failed = p;
    p.saveData = async () => { throw Error('metadata denied'); };
  }), /metadata denied/);
  assert.deepEqual(clone(failed.meta.records), meta.records);
  const { plugin } = await makePlugin(meta, disk);
  assert.equal(U.countOf('water', '2026-10-01', plugin.data.records), 250);
});

test('an unreadable day during a new check-in is not treated as an empty file', async () => {
  const { plugin, disk } = await makePlugin({ habits: [choiceHabit()] });
  const file = plugin.recordsDir + '/' + today + '.json';
  disk.set(file, '{broken-json');
  await assert.rejects(plugin.setChoice('fitness', today, '跑步'), e => e.name === 'SyntaxError');
  assert.equal(disk.get(file), '{broken-json');
  assert.equal(U.countOf('fitness', today, plugin.data.records), 0);
});

test('failed habit settings save keeps original habit settings and records and leaves the dialog open', async () => {
  const old = { ...choiceHabit(), inputMode: 'manual', unit: 'ml', target: 1000, step: 200 };
  const plugin = { data: { habits: [clone(old)], records: { fitness: { [today]: 600 } } }, saveData: async () => { throw Error('settings denied'); } };
  const modal = new HabitFormModal(null, plugin, old);
  let closed = false;
  modal.close = () => { closed = true; };
  await modal.save({ ...clone(old), name: 'changed', useLevels: false });
  assert.deepEqual(clone(plugin.data.habits), [old]);
  assert.equal(plugin.data.records.fitness[today], 600);
  assert.equal(closed, false);
  assert.match(String(loggedErrors.at(-1)[1]), /settings denied/);
});

test('existing local data copy can upgrade and restart without modifying source files', { skip: !process.env.HABIT_EXISTING_PLUGIN }, async () => {
  const source = process.env.HABIT_EXISTING_PLUGIN;
  const metaBytes = fs.readFileSync(path.join(source, 'data.json'), 'utf8');
  const raw = JSON.parse(metaBytes);
  const disk = new Map([[pluginRoot + '/data.json', metaBytes]]);
  const recordDir = path.join(source, 'records');
  const names = fs.existsSync(recordDir) ? fs.readdirSync(recordDir).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)) : [];
  if (names.length) disk.set(pluginRoot + '/records', null);
  const expected = clone(raw.records || {});
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(recordDir, name), 'utf8');
    disk.set(pluginRoot + '/records/' + name, bytes);
    for (const [hid, value] of Object.entries(JSON.parse(bytes))) {
      const key = name.slice(0, 10);
      (expected[hid] = expected[hid] || {})[key] = U.mergeRecord(expected[hid]?.[key], value);
    }
  }
  // Isolate file-format compatibility from legitimate elapsed-timer settlement.
  const configure = p => { p._restoreTimers = () => []; };
  const { plugin } = await makePlugin(raw, disk, configure);
  assert.deepEqual(clone(plugin.data.habits), raw.habits || []);
  for (const [hid, days] of Object.entries(expected)) {
    for (const [key, value] of Object.entries(days)) {
      assert.equal(U.countOf(hid, key, plugin.data.records), U.recordCount(value));
    }
  }
  await plugin.saveData(plugin.data);
  const restarted = (await makePlugin(plugin.meta, disk, configure)).plugin;
  assert.deepEqual(clone(restarted.data.records), clone(plugin.data.records));
  assert.deepEqual(clone(restarted.data.habits), raw.habits || []);
  assert.deepEqual(clone(restarted.data.timers), raw.timers || {});
  assert.equal(fs.readFileSync(path.join(source, 'data.json'), 'utf8'), metaBytes);
  for (const name of names) {
    assert.equal(fs.readFileSync(path.join(recordDir, name), 'utf8'), disk.get(plugin.backupDir + '/records/' + name));
  }
});
