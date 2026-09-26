const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { TemplateRegistry } = require('../app/js/services/template-registry.js');

const registry = new TemplateRegistry();
const templates = registry.getAll();

async function testAllUrls() {
  console.log('==================================================');
  console.log('PROBANDO LAS 21 REFERENCIAS PNG VÍA HTTP (127.0.0.1:8080)');
  console.log('==================================================\n');

  let successCount = 0;
  const results = [];

  for (const t of templates) {
    const rawPath = t.previewFile;
    const urlPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
    const fullUrl = 'http://127.0.0.1:8080' + urlPath;

    await new Promise((resolve) => {
      http.get(fullUrl, (res) => {
        const passed = res.statusCode === 200;
        if (passed) successCount++;
        results.push({
          templateId: t.templateId,
          previewFile: t.previewFile,
          urlResultante: fullUrl,
          httpStatus: res.statusCode,
          passed
        });
        console.log(`${t.templateId} | previewFile: ${t.previewFile} | URL: ${fullUrl} | HTTP ${res.statusCode} ${passed ? '[OK]' : '[FAIL]'}`);
        resolve();
      }).on('error', (err) => {
        results.push({
          templateId: t.templateId,
          previewFile: t.previewFile,
          urlResultante: fullUrl,
          httpStatus: 'ERROR',
          passed: false,
          error: err.message
        });
        console.error(`${t.templateId} | ERROR: ${err.message}`);
        resolve();
      });
    });
  }

  console.log('\n--------------------------------------------------');
  console.log(`RESULTADO HTTP 200: ${successCount}/${templates.length}`);
  console.log('--------------------------------------------------\n');

  return { total: templates.length, successCount, results };
}

if (require.main === module) {
  testAllUrls();
}

module.exports = { testAllUrls };
