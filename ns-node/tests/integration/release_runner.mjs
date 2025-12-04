// Small helper script used by tests to run releaseMatureUnstakes in an isolated Node process
// Usage: set NS_NODE_DB_PATH=<db> && node release_runner.mjs
import { releaseMatureUnstakes } from '../../src/services/chain.js';
import { db } from '../../src/services/state.js';

(async () => {
  try {
    const cutoff = Date.now();
    await releaseMatureUnstakes(cutoff);
    console.log('OK');
    process.exit(0);
  } catch (e) {
    console.error('ERR', e && e.message);
    process.exit(2);
  }
})();
