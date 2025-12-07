import { initAuditLogger, logEvent, queryRecent, exportAll, getDefaultOptions } from '../agent9/audit-logger';
import fs from 'fs';
import path from 'path';

async function runTest(){
  console.log('\n== Audit Logger Tests ==');

  const tmpDir = path.join(process.cwd(),'tests','tmp_audit');
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

  initAuditLogger({ directory: tmpDir, filename: 'audit-test.log.jsonl', maxFileSizeBytes: 1024, maxBackups: 3 });

  // Log a few events
  for(let i=0;i<6;i++){
    await logEvent({ timestamp: new Date().toISOString(), userId: `user-${i}`, correlationId: `cid-${i}`, action: 'test.action', details: { i }, severity: 'info', source: 'tests' });
  }

  const all = await exportAll();
  console.log('Logged events:', all.length);
  if(all.length < 6){
    console.error('❌ Failed: Not all events logged');
    process.exit(2);
  }

  // Force more events to trigger rotation
  for(let i=6;i<60;i++){
    await logEvent({ timestamp: new Date().toISOString(), userId: `user-${i}`, correlationId: `cid-${i}`, action: 'test.action', details: { i }, severity: 'info', source: 'tests' });
  }

  const recent = await queryRecent(5);
  console.log('Recent 5 events count (>=1 expected):', recent.length);
  if(recent.length < 1){
    console.error('❌ Failed: queryRecent returned no events');
    process.exit(2);
  }

  const files = fs.readdirSync(tmpDir).filter(Boolean);
  console.log('Files in log dir:', files);
  if(files.length === 0){
    console.error('❌ Failed: No log files present');
    process.exit(2);
  }

  console.log('✅ Audit Logger tests passed');
  process.exit(0);
}

runTest();
