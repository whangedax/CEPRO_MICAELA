const { run } = require('./tests/architecture_hardening_01.regression.js');
const { spawn } = require('child_process');

(async () => {
  const server = spawn('node', ['scripts/dev-server.js']);
  await new Promise(r => setTimeout(r, 1000));
  try {
    const res = await run();
    console.log(res);
  } finally {
    server.kill();
  }
})();
