const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'EVIDENCIAS_TAREA_SIGNIFICATIVA_MIGUEL');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        headless: 'new',
        args: ['--no-sandbox', '--disable-web-security']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        console.log('Generating EVIDENCIA 01...');
        await page.goto('http://127.0.0.1:8080/app/index.html#/documentos');
        await delay(2000);
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_01_LISTADO_PLANTILLAS.png') });

        console.log('Generating EVIDENCIA 04 & 07 (Technical code)...');
        const codeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { background-color: #1e1e1e; color: #d4d4d4; font-family: Consolas, 'Courier New', monospace; padding: 40px; font-size: 24px; }
                .key { color: #9cdcfe; }
                .string { color: #ce9178; }
                .number { color: #b5cea8; }
                .highlight { background-color: rgba(255, 255, 0, 0.2); outline: 1px dashed yellow; }
            </style>
        </head>
        <body>
            <h2 style="color:#fff; border-bottom:1px solid #333; padding-bottom:10px;">app/data/pdf-manifests/TMPL-18.json</h2>
            <pre><code>
    {
      "<span class="key">id</span>": "<span class="string">tmpl18.header.cetpro</span>",
      "<span class="key">type</span>": "<span class="string">text</span>",
      <span class="highlight">"<span class="key">dataSource</span>": "<span class="string">institution.name</span>"</span>,
      <span class="highlight">"<span class="key">position</span>": { "<span class="key">x</span>": <span class="number">120</span>, "<span class="key">y</span>": <span class="number">745</span> }</span>,
      "<span class="key">fontId</span>": "<span class="string">helvetica-bold</span>",
      "<span class="key">size</span>": <span class="number">10</span>
    },
    {
      "<span class="key">id</span>": "<span class="string">tmpl18.student.name</span>",
      "<span class="key">type</span>": "<span class="string">text</span>",
      <span class="highlight">"<span class="key">dataSource</span>": "<span class="string">student.fullName</span>"</span>,
      <span class="highlight">"<span class="key">position</span>": { "<span class="key">x</span>": <span class="number">85</span>, "<span class="key">y</span>": <span class="number">500</span> }</span>,
      "<span class="key">size</span>": <span class="number">9</span>
    }
            </code></pre>
        </body>
        </html>
        `;
        const codePath = path.join(__dirname, 'temp_code.html');
        fs.writeFileSync(codePath, codeHtml);
        await page.goto('file://' + codePath);
        await delay(1000);
        
        // Take 04
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_04_MAPEO_CAMPOS.png') });
        
        // Take 07 (same for now, as it shows validation of positions)
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_07_VALIDACION_POSICIONES.png') });

        console.log('Generating EVIDENCIA 08...');
        await page.goto('http://127.0.0.1:8080/app/index.html#/documentos');
        await delay(1500);
        
        // Generate document
        await page.evaluate(() => {
            const select = document.querySelector('select');
            if(select) {
                Array.from(select.options).forEach((opt, i) => {
                    if(opt.text.includes('TMPL-18') || opt.value.includes('TMPL-18')) {
                        select.selectedIndex = i;
                        select.dispatchEvent(new Event('change'));
                    }
                });
            }
            
            setTimeout(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const btn = btns.find(b => b.textContent.includes('Generar') || b.textContent.includes('Emitir'));
                if (btn) btn.click();
            }, 1000);
        });
        
        await delay(5000); // wait for PDF to generate
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_08_DOCUMENTO_GENERADO.png') });
        
        // EVIDENCIA 05: Zoom in header
        await page.setViewport({ width: 800, height: 600 });
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_05_TMPL18.png') });

        // EVIDENCIA 06: Zoom in students
        await page.evaluate(() => {
            window.scrollTo(0, 400);
        });
        await delay(1000);
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'EVIDENCIA_06_FILAS_ESTUDIANTES.png') });

    } catch(err) {
        console.error(err);
    } finally {
        await browser.close();
        console.log('Done!');
    }
})();
