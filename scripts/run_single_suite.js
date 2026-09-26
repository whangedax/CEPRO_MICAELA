const path = require('path');

const filename = process.argv[2];
if (!filename) {
  console.error('Filename argument required');
  process.exit(1);
}

const suitePath = path.resolve(__dirname, '..', 'tests', filename);
const suite = require(suitePath);

(async () => {
  try {
    if (!suite.name || typeof suite.run !== 'function') {
      throw new Error(`Suite inválida: ${filename}`);
    }
    const result = await suite.run();
    if (process.send) {
      process.send({
        suite: suite.name,
        total: result.total,
        passed: result.passed,
        failed: result.failed
      });
    }
    process.exit(result.failed ? 1 : 0);
  } catch (err) {
    console.error(`Error in suite ${filename}:`, err);
    process.exit(1);
  }
})();
