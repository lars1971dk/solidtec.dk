import { put, list, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { dayKey, dayRange } from './core.js';

export async function record(site,page) {
  const path = 'views/' + dayKey() + '/' + site + '/' + page + '/' + randomUUID() + '.json';
  // Independent immutable count entries prevent lost updates from concurrent requests.
  // The random object key is generated on the server and never sent to the visitor.
  await put(path, '{"views":1}', { access:'private', addRandomSuffix:false, contentType:'application/json' });
}
export async function pathsSince(days) {
  const start = dayRange(days)[0];
  const paths = [];
  let cursor;
  do {
    const result = await list({prefix:'views/',limit:1000,cursor});
    for (const item of result.blobs) if (item.pathname.slice(6,16) >= start) paths.push(item.pathname);
    cursor = result.hasMore ? result.cursor : undefined;
    if (paths.length > 100000) throw new Error('Report limit exceeded');
  } while(cursor);
  return paths;
}
export async function prune() {
  const cutoff = dayRange(90)[0];
  let cursor;
  let removed=0;
  do {
    const result = await list({prefix:'views/',limit:1000,cursor});
    const old = result.blobs.filter(item => item.pathname.slice(6,16) < cutoff);
    if(old.length) { await del(old.map(item=>item.url)); removed += old.length; }
    cursor = result.hasMore ? result.cursor : undefined;
  } while(cursor);
  return removed;
}
