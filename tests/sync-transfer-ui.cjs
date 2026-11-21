// Integration UI against an ephemeral service and synthetic data only.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const { OfflineCore } = require('../scripts/offline-core.cjs');
const { createService } = require('../scripts/offline-http.cjs');
const root = path.resolve(__dirname, '..');
const key = 'Clave-QA-Intercambio-2026';
async function setValue(page, selector, value) {
  await page.$eval(selector, (element, text) => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function clickText(page, text) {
  await page.$$eval('button', (elements, label) => {
    const button = elements.find(element => element.textContent.trim() === label);
    if (!button || button.disabled) throw new Error('Button unavailable: ' + label);
    button.click();
  }, text);
}
async function main() {
  const parent = path.join(root, 'dev-sandbox/data/sync-ui');
  fs.mkdirSync(parent, { recursive: true });
  const directory = fs.mkdtempSync(path.join(parent, 'case-'));
  const evidence = path.join(directory, 'evidence'); fs.mkdirSync(evidence);
  const seed = new OfflineCore(directory, null);
  seed.setup({ username: 'director.qa', password: 'DirectorQA123!', name: 'Dirección QA', institutionName: 'Institución sintética QA', importBaseline: false });
  const director = seed.users()[0];
  const group = seed.saveGroup(director, { name: 'Aula QA de sincronización', programId: 'PROG-005', moduleId: 'MOD-009', periodId: '2026-I', units: ['UD1', 'UD2'] });
  const teacher = seed.saveUser(director, { username: 'docente.qa', name: 'Docente QA', password: 'DocenteQA123!', role: 'DOCENTE', assignments: [{ groupId: group.id, units: ['UD1', 'UD2'] }] });
  const secretary = seed.saveUser(director, { username: 'secretaria.qa', name: 'Secretaría QA', password: 'SecretariaQA123!', role: 'SECRETARIA' });
  const student = seed.saveStudent(director, { name: 'Estudiante sintético', document: '00112233' });
  const enrollment = seed.enroll(director, { groupId: group.id, studentId: student.id, startDate: '2026-03-01' });
  seed.saveAcademic(seed.user(teacher.id), 'grades', { groupId: group.id, unit: 'UD1', indicator: 'IL1', rows: [{ enrollmentId: enrollment.id, value: 17 }] });
  seed.close();
  const service = createService({ root, directory, backupFile: null });
  const backend = service.server(); let vite, browser;
  const checks = [], errors = [];
  try {
    await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
    const { createServer } = await import('vite');
    vite = await createServer({ root, cacheDir: path.join(directory, 'vite-cache'), logLevel: 'error', server: {
      port: 0, host: '127.0.0.1', proxy: { '/api': { target: `http://127.0.0.1:${backend.address().port}`, changeOrigin: false } },
    } });
    await vite.listen();
    browser = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, userDataDir: path.join(directory, 'browser') });
    const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const scenarios = [
      { username: 'director.qa', password: 'DirectorQA123!', role: 'DIRECTOR', module: 'config', to: teacher.id },
      { username: 'secretaria.qa', password: 'SecretariaQA123!', role: 'SECRETARIA', module: 'enrollments', to: teacher.id },
      { username: 'docente.qa', password: 'DocenteQA123!', role: 'DOCENTE', module: 'grades', to: secretary.id },
      { username: 'docente.qa', password: 'DocenteQA123!', role: 'DOCENTE', module: 'grades', to: director.id },
    ];
    for (const [index, scenario] of scenarios.entries()) {
      const page = await browser.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width: 1366, height: 1000 });
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.type('#username', scenario.username); await page.type('#password', scenario.password);
      await page.click('button[type="submit"]'); await page.waitForSelector('#main-content');
      await page.evaluate(() => { window.location.hash = '#/sincronizacion'; });
      await page.waitForSelector('#transfer-intent-send');
      assert.equal(await page.$('#transfer-passphrase'), null, 'Entry hides detailed form');
      await page.click('#transfer-intent-send'); await page.waitForSelector('#transfer-module');
      if(scenario.role === 'DOCENTE') assert.equal(await page.$('#transfer-module-config'), null, 'Teacher cannot send configuration');
      await page.click('#transfer-module-' + scenario.module);
      await page.click('[data-testid="transfer-next"]');
      await page.waitForSelector('#transfer-recipient'); await page.select('#transfer-recipient', scenario.to);
      await page.click('[data-testid="transfer-next"]'); await page.waitForSelector('#transfer-passphrase');
      await setValue(page, '#transfer-passphrase', key);
      await page.waitForFunction(() => !document.querySelector('#transfer-generate').disabled);
      const usbResponse = page.waitForResponse(response => response.url().endsWith('/api/network/sync/export') && response.status() === 200);
      await page.click('#transfer-generate'); await page.waitForSelector('#transfer-generated-code');
      const usbPackage = await (await usbResponse).json();
      const client = await page.createCDPSession();
      await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
      await clickText(page, 'Descargar archivo alternativo');
      const downloaded = path.join(directory, usbPackage.fileName);
      for (let attempt = 0; attempt < 50 && !fs.existsSync(downloaded); attempt++) await new Promise(resolve => setTimeout(resolve, 100));
      assert(fs.existsSync(downloaded), 'The browser downloads a real .cetpro file');
      assert.equal(JSON.parse(fs.readFileSync(downloaded, 'utf8')).body.id, usbPackage.package.body.id);
      const token = await page.$eval('#transfer-generated-code', element => element.value);
      assert(token.includes('CETPRO-SYNC:v1:'), 'Every role generates a valid WhatsApp block');
      checks.push(`${scenario.role}: export ${scenario.module} via WhatsApp`);
      await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Synthetic clipboard denied');}}}));
      await clickText(page,'Copiar mensaje');
      await page.waitForFunction(()=>document.querySelector('[aria-labelledby="transfer-send-heading"]').textContent.includes('Ctrl+C'));
      assert(await page.$eval('#transfer-generated-code',e=>e.selectionEnd-e.selectionStart===e.value.length),'Clipboard denial provides selected complete message');
      checks.push(`${scenario.role}: manual copy fallback preserves complete message`);
      await page.screenshot({ path: path.join(evidence, `${scenario.role}-send.png`), fullPage: true });
      await page.click('[data-testid="transfer-back"]');
      await page.select('#transfer-channel', 'USB');
      assert.equal(await page.$('#transfer-generated-code'), null, 'Changing the channel discards the previous code');
      await page.click('#transfer-generate'); await page.waitForFunction(() => document.querySelector('[aria-current=step]')?.textContent.includes('Listo'));
      checks.push(`${scenario.role}: USB package generated and old output invalidated`);
      await clickText(page, 'Volver al inicio'); await page.click('#transfer-intent-receive'); await page.waitForSelector('#transfer-code-input');
      // A code addressed to a different account must fail without modifying data.
      await setValue(page, '#transfer-code-input', token); await page.click('[data-testid="transfer-next"]'); await page.waitForSelector('#transfer-passphrase'); await setValue(page, '#transfer-passphrase', key);
      const before = service.core.operations().length;
      await page.click('#transfer-review');
      await page.waitForSelector('[aria-labelledby="transfer-receive-heading"] [role="alert"]');
      assert.equal(service.core.operations().length, before);
      checks.push(`${scenario.role}: rejects package addressed to another account`);
      const receiver = await browser.newPage(); receiver.on('pageerror', error => errors.push(error.message));
      await receiver.setViewport({ width: 1024, height: 1000 });
      await receiver.goto(url, { waitUntil: 'networkidle0' });
      const receiverIsTeacher = scenario.to === teacher.id;
      await receiver.type('#username', receiverIsTeacher ? 'docente.qa' : scenario.to === director.id ? 'director.qa' : 'secretaria.qa');
      await receiver.type('#password', receiverIsTeacher ? 'DocenteQA123!' : scenario.to === director.id ? 'DirectorQA123!' : 'SecretariaQA123!');
      await receiver.click('button[type="submit"]'); await receiver.waitForSelector('#main-content');
      await receiver.evaluate(() => { location.hash = '#/sincronizacion'; });
      await receiver.waitForSelector('#transfer-intent-receive'); await receiver.click('#transfer-intent-receive'); await receiver.waitForSelector('#transfer-code-input');
      if (index === 1) { await receiver.click('#transfer-source-file'); await (await receiver.$('#transfer-file')).uploadFile(downloaded); }
      else await setValue(receiver, '#transfer-code-input', token);
      await receiver.click('[data-testid="transfer-next"]'); await receiver.waitForSelector('#transfer-passphrase');
      await setValue(receiver, '#transfer-passphrase', key);
      await receiver.waitForFunction(() => !document.querySelector('#transfer-review').disabled);
      const beforeReceive=service.core.operations().length;
      await receiver.click('#transfer-review'); await receiver.waitForSelector('#transfer-confirm');
      assert.equal(service.core.operations().length,beforeReceive,'Signed preview never writes');
      await receiver.screenshot({path:path.join(evidence,`${scenario.role}-receive-preview.png`),fullPage:true});
      assert.equal(await receiver.$eval('#transfer-confirm', element => element.disabled), true);
      await (await receiver.$('[aria-labelledby="transfer-receive-heading"] input[type="checkbox"]')).click();
      await receiver.click('#transfer-confirm');
      await receiver.waitForFunction(() => document.querySelector('[aria-labelledby="transfer-receive-heading"]').textContent.includes('Información recibida'));
      assert.equal(await receiver.$('[aria-labelledby="transfer-receive-heading"] [role="alert"]'), null);
      checks.push(`${scenario.role}: intended recipient previews and confirms ${index === 1 ? 'downloaded USB file' : 'WhatsApp code'}`);
      await receiver.screenshot({ path: path.join(evidence, `${scenario.role}-received.png`), fullPage: true });
      await receiver.close();
      await page.evaluate(() => { window.location.hash = '#/datos'; });
      await page.waitForSelector('#data-intent-download');
      // Download a real Excel file through the four-step flow.
      await page.click('#data-intent-download'); await page.click('#data-kind-estudiantes');
      await page.click('[data-testid="data-next"]'); await page.select('#export-format-select','xlsx');
      await page.click('[data-testid="data-next"]');
      await page.click('[data-testid="data-download"]'); await page.waitForFunction(()=>document.querySelector('#data-flow-heading')?.textContent.includes('preparado'));
      const excel = path.join(directory,'CETPRO_estudiantes.xlsx');
      for (let attempt=0;attempt<50&&!fs.existsSync(excel);attempt++) await new Promise(r=>setTimeout(r,100));
      assert(fs.existsSync(excel),'Real XLSX downloaded');
      checks.push(`${scenario.role}: Excel download guided and successful`);
      await clickText(page,'Volver al inicio'); await page.click('#data-intent-update'); await page.click('#data-kind-estudiantes');
      if (scenario.role !== 'DOCENTE') assert.equal(await page.$('#data-kind-notas'),null,'Administrators receive signed grades through sync');
      await page.click('[data-testid="data-next"]'); await page.waitForSelector('#tabular-file-input');
      // Read the exported XLSX back without applying anything; Back preserves its identity.
      await (await page.$('#tabular-file-input')).uploadFile(excel);
      await page.waitForFunction(()=>!document.querySelector('#tabular-preview').disabled);
      const beforeSheet=service.core.operations().length;
      await page.click('#tabular-preview'); await page.waitForSelector('#tabular-confirm');
      assert.equal(service.core.operations().length,beforeSheet);
      assert.equal(await page.$eval('#tabular-confirm',e=>e.disabled),true);
      await page.click('[data-testid="data-back"]'); await page.waitForSelector('#tabular-file-input');
      assert(await page.evaluate(()=>document.body.textContent.includes('CETPRO_estudiantes.xlsx')),'Back preserves file selection');
      checks.push(`${scenario.role}: real XLSX preview, no writes, Back preserves file`);
      const file = path.join(directory, `${scenario.role}.json`);
      fs.writeFileSync(file, JSON.stringify({ app: 'CETPRO_TABLE', kind: 'estudiantes', version: 1, rows: [{
        accion: 'CREAR', dni: `0088770${index}`, nombre_completo: `Estudiante UI ${scenario.role}`, grupo_id: group.id, fecha_ingreso: '2026-03-01',
      }] }));
      await (await page.$('#tabular-file-input')).uploadFile(file);
      await page.waitForFunction(() => !document.querySelector('#tabular-preview').disabled);
      const beforePreview=service.core.operations().length;
      await page.click('#tabular-preview');
      await page.waitForSelector('#tabular-confirm');
      assert.equal(service.core.operations().length,beforePreview,'Tabular preview never writes');
      assert(await page.evaluate(()=>document.body.textContent.includes('Valor anterior → recibido')));
      await page.screenshot({path:path.join(evidence,`${scenario.role}-data-preview.png`),fullPage:true});
      assert.equal(await page.$eval('#tabular-confirm', element => element.disabled), true);
      const checkbox = await page.$('input[type="checkbox"]'); assert(checkbox);
      await checkbox.click(); await page.click('#tabular-confirm');
      await page.waitForFunction(() => !document.querySelector('#tabular-confirm'));
      if (scenario.role === 'DOCENTE') {
        assert(service.core.records('studentRequests').some(row => row.document === `0088770${index}`));
        assert(!service.core.records('students').some(row => row.document === `0088770${index}`));
      } else assert(service.core.records('students').some(row => row.document === `0088770${index}`));
      checks.push(`${scenario.role}: real JSON file preview/confirm respects update versus proposal authority`);
      await page.setViewport({ width: 1024, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at 1024px');
      await clickText(page,'Volver al inicio');
      await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#main-content')?.scrollTo(0,0);});
      await page.screenshot({ path: path.join(evidence, `${scenario.role}-data.png`), fullPage: true });
      // Typography is served locally and both themes have readable semantic colors.
      assert((await page.$eval('h1',e=>getComputedStyle(e).fontFamily)).includes('Jakarta'));
      for(const theme of ['light','dark']) {
        await page.evaluate(value=>{document.documentElement.classList.toggle('dark',value==='dark');},theme);
        await new Promise(r=>setTimeout(r,400));
        await page.screenshot({path:path.join(evidence,`${scenario.role}-data-${theme}.png`),fullPage:true});
      }
      checks.push(`${scenario.role}: local typography, themes, 1024px layout`);
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
    console.log(`PASS ${checks.length} UI scenarios across 3 roles, zero browser errors`);
    console.log(`Evidence: ${evidence}`);
  } finally {
    if (browser) await browser.close(); if (vite) await vite.close();
    if (backend.listening) await new Promise(resolve => backend.close(resolve)); service.core.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
