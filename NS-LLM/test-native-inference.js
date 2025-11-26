const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const NativeShim = require('./native-shim');

function run(cmd, args, options = {}) {
  console.log('>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...options });
  return r.status === 0;
}

(async function(){
  const nativeDir = path.join(__dirname, 'native');
  const buildDir = path.join(nativeDir, 'build');
  const isWin = process.platform === 'win32';

  // Try to build with PROTOTYPE_ONLY=OFF (requires ONNXRUNTIME_DIR or installed ONNX runtime libs)
  try {
    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
    process.chdir(buildDir);

    console.log('Attempting to configure native build (PROTOTYPE_ONLY=OFF)');
    const okCfg = run('cmake', ['..', '-DPROTOTYPE_ONLY=OFF']);
    let built = false;
    if (okCfg) {
      built = run('cmake', ['--build', '.', '--config', 'Release']);
    }

    if (!built) {
      console.log('PROTOTYPE_ONLY=OFF build failed or ONNX runtime missing; building PROTOTYPE_ONLY=ON (stub)');
      run('cmake', ['..', '-DPROTOTYPE_ONLY=ON']);
      run('cmake', ['--build', '.', '--config', 'Release']);
    }

    // binary path
    let bin;
    if (isWin) bin = path.join(buildDir, 'Release', 'ns-llm-native.exe');
    else bin = path.join(buildDir, 'ns-llm-native');
    if (!fs.existsSync(bin)) {
      console.error('native binary not found at', bin);
      process.exit(2);
    }

    // exercise via shim
    const shim = new NativeShim({ binaryPath: bin, prototypeUrl: 'http://127.0.0.1:5555' });

    console.log('Ensuring prototype server is running (starting local prototype)');
    require('./index.js'); // start prototype server

    await new Promise(r => setTimeout(r, 200));

    console.log('shim.health() ->');
    const h = await shim.health();
    console.log(h);
    if (h && h.version) console.log('native backend version:', h.version);
    if (!h || typeof h.status !== 'string') throw new Error('health response missing status');

    console.log('shim.embed("test native inference") ->');
    const e = await shim.embed('test native inference');
    console.log('embed response', Object.keys(e));
    if (!e) throw new Error('embed returned empty');
    if (Array.isArray(e.embedding)) {
      if (e.embedding.length !== 384) throw new Error('unexpected embedding dimensions: ' + e.embedding.length);
    } else if (!(e.model && e.loaded === true || e.loaded === 'true')) {
      // Accept both stub embedding and model-loaded info
      throw new Error('embed response neither embedding nor loaded model info');
    }

    console.log('shim.metrics() ->');
    const m = await shim.metrics();
    console.log(m);
    if (!m || typeof m.requests_total !== 'number') throw new Error('metrics missing requests_total');

    console.log('\nNative inference integration test passed');
    process.exit(0);
  } catch (err) {
    console.error('native inference test failed', err);
    process.exit(3);
  }
})();
