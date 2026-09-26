const path = require('path');
const { pathToFileURL } = require('url');

async function run() {
  const root = path.join(__dirname, '..');
  const [{ TEMPLATE_FIELD_CONTRACTS }, { getBindingCoverage }] = await Promise.all([
    import(pathToFileURL(path.join(root, 'app/js/services/document-field-contract.js')).href),
    import(pathToFileURL(path.join(root, 'app/js/services/document-binding-service.js')).href)
  ]);
  const rows = ['| Plantilla | Campo contractual | ContractStatus declarativo | BindingStatus |',
    '|---|---|---|---|'];
  for (const [templateId, fields] of Object.entries(TEMPLATE_FIELD_CONTRACTS)) {
    for (const field of getBindingCoverage(templateId, fields).fields) {
      rows.push(`| ${templateId} | \`${field.key}\` | ${field.status} | ${field.bindingStatus} |`);
    }
  }
  console.log(rows.join('\n'));
  console.error(`COVERAGE: ${Object.keys(TEMPLATE_FIELD_CONTRACTS).length} plantillas, ${rows.length - 2} campos`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
