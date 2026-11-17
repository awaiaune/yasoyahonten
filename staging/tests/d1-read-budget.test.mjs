import test from 'node:test';
import assert from 'node:assert/strict';
import { Supervision } from '../../worker/src/management/supervision.js';
import { Store } from '../../worker/src/management/store.js';

const env = {
  RUNTIME_TIER: 'staging',
  SQUARE_ENVIRONMENT: 'sandbox',
  SQUARE_ACCESS_MODE: 'READ_WRITE',
  VALIDATION_CHECKOUT_ENABLED: '0',
  VALIDATION_MAIL_ENABLED: '0',
  VALIDATION_CRON_ENABLED: '0',
  MANAGEMENT_ENABLED: '1',
  MANAGEMENT_STOCK_WRITES: 'single-writer',
  MANAGEMENT_CHECKOUT_PAUSED: '0'
};

test('idle management queue never sets a recurring DO Alarm or writes D1', async () => {
  let alarms = 0;
  let writes = 0;
  const manager = {
    env,
    s: {
      one: async () => ({ due: null }),
      run: async () => { writes++; }
    },
    storage: {
      getAlarm: async () => null,
      setAlarm: async () => { alarms++; }
    }
  };
  const result = await new Supervision(manager).schedule();
  assert.equal(result, false);
  assert.equal(alarms, 0);
  assert.equal(writes, 0);
});

test('pending management work still arms one deadline-limited DO Alarm', async () => {
  let when = null;
  let writes = 0;
  const due = Date.now() + 180_000;
  const manager = {
    env,
    s: {
      one: async () => ({ due }),
      run: async () => { writes++; }
    },
    storage: {
      getAlarm: async () => null,
      setAlarm: async (value) => { when = value; }
    }
  };
  const start = Date.now();
  assert.equal(await new Supervision(manager).schedule(), true);
  assert.equal(typeof when, 'number');
  assert.ok(when >= start + 1000);
  assert.ok(when <= Date.now() + 61_000);
  assert.equal(writes, 1);
});

test('concurrent retirement checks use one historical SQL read per Store instance', async () => {
  let sqlReads = 0;
  let sqlWrites = 0;
  const db = {
    prepare(sql) {
      return {
        bind() {
          return {
            async all() {
              assert.match(sql, /mg_revisions/);
              sqlReads++;
              return { results: [{
                id: 'goldenrod',
                slug: 'goldenrod',
                data_json: JSON.stringify({ name: 'セイタカアワダチソウ', variants: [] })
              }] };
            },
            async run() { sqlWrites++; return { success: true }; }
          };
        }
      };
    }
  };
  const st = new Store({ ...env, ORDERS_DB: db });
  const sets = await Promise.all(Array.from({ length: 12 }, () => st.retiredProductIds()));
  assert.equal(sqlReads, 1);
  for (const set of sets) assert.ok(set.has('goldenrod'));
  // Any mutation invalidates the memoized read without discarding any data.
  await st.run('UPDATE mg_products SET version=version WHERE id=?', ['goldenrod']);
  assert.equal(sqlWrites, 1);
  const after = await st.retiredProductIds();
  assert.ok(after.has('goldenrod'));
  assert.equal(sqlReads, 2);
  const otherRequest = new Store({ ...env, ORDERS_DB: db });
  assert.ok((await otherRequest.retiredProductIds()).has('goldenrod'));
  assert.equal(sqlReads, 3);
});

test('retired SQL failures are not memoized', async () => {
  let reads = 0;
  const db = {
    prepare() {
      return { bind() { return { async all() {
        reads++;
        if (reads === 1) throw Error('transient read failure');
        return { results: [] };
      } }; } };
    }
  };
  const st = new Store({ ...env, ORDERS_DB: db });
  await assert.rejects(() => st.retiredProductIds(), /transient/);
  assert.deepEqual([...await st.retiredProductIds()], []);
  assert.equal(reads, 2);
});
