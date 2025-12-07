import { TokenAggregator, EditThrottler, BackpressureQueue, estimateTokens, formatError } from '../agent9/streaming-manager';

async function run(){
  console.log('\n== Streaming Manager Tests ==');

  // TokenAggregator
  const agg = new TokenAggregator(100);
  agg.addTokens(30);
  if (!agg.consumeTokens(10)) { console.error('❌ TokenAggregator consume fail'); process.exit(2); }
  if (agg.getTokens() !== 20) { console.error('❌ TokenAggregator count mismatch', agg.getTokens()); process.exit(2); }

  // EditThrottler
  const et = new EditThrottler(3, 1000); // 3 edits per sec
  const uid = 'user-test';
  if (!et.recordEdit(uid)) { console.error('❌ EditThrottler immediate allow failed'); process.exit(2); }
  if (!et.recordEdit(uid)) { console.error('❌ EditThrottler second allow failed'); process.exit(2); }
  if (!et.recordEdit(uid)) { console.error('❌ EditThrottler third allow failed'); process.exit(2); }
  if (et.recordEdit(uid)) { console.error('❌ EditThrottler should have blocked 4th'); process.exit(2); }
  et.clear(uid);
  if (!et.recordEdit(uid)) { console.error('❌ EditThrottler did not allow after clear'); process.exit(2); }

  // BackpressureQueue
  const processed: string[] = [];
  const handler = async (chunk: string) => { await new Promise(r=>setTimeout(r, 30)); processed.push(chunk); };
  // Make concurrency 1 and max queue size 2 so we can deterministically overflow
  const q = new BackpressureQueue<string>(1, 2, handler);

  await q.enqueue('a');
  await q.enqueue('b');
  let overflowed = false;
  try {
    await q.enqueue('c');
    // If no throw, allow a brief moment and attempt again to detect overflow
    await new Promise(r => setTimeout(r, 10));
  } catch(e) { overflowed = true; }

  try {
    if (!overflowed) await q.enqueue('c');
    console.error('❌ BackpressureQueue should have thrown on overflow');
    process.exit(2);
  } catch (err:any) {
    // should be formatted ServiceError
    if (err && err.code !== 'BACKPRESSURE') {
      console.error('❌ BackpressureQueue threw unexpected error', err);
      process.exit(2);
    }
  }

  // ensure processing completes
  await new Promise(r=>setTimeout(r, 300));
  if (processed.length < 3) { console.error('❌ BackpressureQueue processed less than expected', processed.length); process.exit(2); }

  // estimateTokens
  const tokens = estimateTokens('hello world this is a test');
  if (tokens < 1) { console.error('❌ estimateTokens returned invalid', tokens); process.exit(2); }

  console.log('✅ Streaming Manager tests passed');
  process.exit(0);
}

run();
