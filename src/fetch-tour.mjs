// 투어 원본 수집: data/raw/<날짜>/tour-<league>-<latest|live>.json
// 사용: node src/fetch-tour.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { LEAGUES, calendar, leaderboard } from './espn.mjs';
import { today } from './util.mjs';

const date = today();
const dir = new URL(`../data/raw/${date}/`, import.meta.url);
await mkdir(dir, { recursive: true });

let failed = 0;
for (const league of Object.keys(LEAGUES)) {
  try {
    const { latest, live, next } = await calendar(league);
    const picks = { latest };
    if (live && live.id !== latest?.id) picks.live = live;
    for (const [kind, ev] of Object.entries(picks)) {
      if (!ev) continue;
      const lb = await leaderboard(league, ev.id);
      const out = { fetchedAt: new Date().toISOString(), source: 'ESPN', kind, ...lb, next: next ? { name: next.label, start: next.startDate } : null };
      await writeFile(new URL(`tour-${league}-${kind}.json`, dir), JSON.stringify(out, null, 1));
      console.log(`${league} ${kind}: ${lb.name} (${lb.state}) ${lb.players.length}명`);
    }
  } catch (err) {
    failed++;
    console.error(`✗ ${league}: ${err.message}`);
  }
}
if (failed) process.exitCode = 1;
