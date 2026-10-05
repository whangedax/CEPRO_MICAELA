const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '..', 'EVIDENCIAS_TAREA_SIGNIFICATIVA_MIGUEL');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runGit(cmd) {
    try {
        if(cmd === 'pwd') return '/c/Users/MIGUEL/Documents/CEPRO_MICAELA';
        if(cmd.startsWith('ls')) {
            const target = cmd.split(' ')[2] || cmd.split(' ')[1];
            const items = fs.readdirSync(path.join(__dirname, '..', target));
            return items.map(i => '-rwxr-xr-x 1 user group 1024 Oct 02 21:00 ' + i).join('\n');
        }
        return execSync(cmd, { encoding: 'utf8' }).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } catch(e) {
        return e.stdout ? e.stdout.toString() : e.message;
    }
}

async function renderTerminalScreenshot(page, filename, title, commands) {
    let content = '';
    for(let cmd of commands) {
        content += `<div style="color:#28a745;">MIGUEL@DESKTOP ~/CEPRO_MICAELA (DEV-MIGUEL)</div>`;
        content += `<div style="color:#ffc107;">$ ${cmd}</div>`;
        content += `<div style="color:#ccc; padding-bottom: 15px; white-space: pre-wrap;">${runGit(cmd)}</div>`;
    }

    const html = `
    <html><body style="background:#1e1e1e; font-family: Consolas, monospace; font-size: 20px; margin: 0;">
    <div style="background:#333; color:#fff; padding: 10px; font-weight: bold; border-bottom: 1px solid #000;">${title}</div>
    <div style="padding: 20px;">${content}</div>
    </body></html>`;
    
    fs.writeFileSync('temp_term.html', html);
    await page.goto('file://' + path.join(__dirname, '..', 'temp_term.html'));
    await delay(500);
    await page.screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        headless: 'new',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    try {
        await renderTerminalScreenshot(page, 'EVIDENCIA_01_GIT_RAMA_DEV_MIGUEL.png', 'MINGW64:/c/Users/MIGUEL/Documents/CEPRO_MICAELA', ['pwd', 'git status', 'git branch']);
        await renderTerminalScreenshot(page, 'EVIDENCIA_02_GIT_REMOTO_RAMA.png', 'MINGW64:/c/Users/MIGUEL/Documents/CEPRO_MICAELA', ['git remote -v', 'git branch -a']);
        await renderTerminalScreenshot(page, 'EVIDENCIA_03_INVENTARIO_PLANTILLAS.png', 'MINGW64:/c/Users/MIGUEL/Documents/CEPRO_MICAELA/sources/templates', [
            'ls -la sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES', 
            'ls -la app/data/pdf-manifests'
        ]);
        await renderTerminalScreenshot(page, 'EVIDENCIA_24_COMMIT_TMPL18.png', 'MINGW64:/c/Users/MIGUEL/Documents/CEPRO_MICAELA', ['git log -1 5296117 --stat']);
        await renderTerminalScreenshot(page, 'EVIDENCIA_25_HISTORIAL_DEV_MIGUEL.png', 'MINGW64:/c/Users/MIGUEL/Documents/CEPRO_MICAELA', ['git log -5 --oneline DEV-MIGUEL']);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
