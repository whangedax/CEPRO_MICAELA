/**
 * scripts/sign-executables.cjs
 * 
 * Tooling de Firma Digital y Verificación Authenticode para Windows (OBS-41B-01).
 * 
 * Proporciona el mecanismo institucional de firma con:
 * - Set-AuthenticodeSignature (PowerShell nativo).
 * - Algoritmo de hash SHA-256.
 * - Servidor de sello de tiempo RFC 3161 (http://timestamp.digicert.com).
 * - Detección y uso de certificado PFX vía variables de entorno:
 *   - AUTHENTICODE_PFX_PATH: Ruta al archivo .pfx
 *   - AUTHENTICODE_PFX_PASSWORD: Clave privada del certificado (opcional si no tiene clave)
 *   - AUTHENTICODE_TIMESTAMP_SERVER: URL RFC 3161 (default: http://timestamp.digicert.com)
 * - Modo verificación estructurada con Get-AuthenticodeSignature (reportando NotSigned si no hay PFX provisto).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');

const DEFAULT_TIMESTAMP_SERVER = 'http://timestamp.digicert.com';

function calculateSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function verifySignature(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  const psScript = `
    $ErrorActionPreference = 'Stop'
    $sig = Get-AuthenticodeSignature -LiteralPath '${filePath.replace(/'/g, "''")}'
    [PSCustomObject]@{
      Path = $sig.Path
      Status = $sig.Status.ToString()
      StatusMessage = $sig.StatusMessage
      IsOSBinary = $sig.IsOSBinary
      SignerSubject = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { $null }
      SignerThumbprint = if ($sig.SignerCertificate) { $sig.SignerCertificate.Thumbprint } else { $null }
      TimeStamperSubject = if ($sig.TimeStamperCertificate) { $sig.TimeStamperCertificate.Subject } else { $null }
    } | ConvertTo-Json -Compress
  `;

  const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
    encoding: 'utf8',
  });

  if (res.error) {
    throw res.error;
  }

  try {
    const parsed = JSON.parse(res.stdout.trim());
    return {
      file: filePath,
      sha256: calculateSha256(filePath),
      status: parsed.Status,
      statusMessage: parsed.StatusMessage,
      signerSubject: parsed.SignerSubject,
      signerThumbprint: parsed.SignerThumbprint,
      timeStamperSubject: parsed.TimeStamperSubject,
    };
  } catch (err) {
    return {
      file: filePath,
      sha256: calculateSha256(filePath),
      status: 'Unknown',
      statusMessage: (res.stderr || res.stdout || err.message).trim(),
      signerSubject: null,
      signerThumbprint: null,
      timeStamperSubject: null,
    };
  }
}

function signFile(filePath, options = {}) {
  const pfxPath = options.pfxPath || process.env.AUTHENTICODE_PFX_PATH;
  const pfxPassword = options.pfxPassword || process.env.AUTHENTICODE_PFX_PASSWORD || '';
  const timestampServer = options.timestampServer || process.env.AUTHENTICODE_TIMESTAMP_SERVER || DEFAULT_TIMESTAMP_SERVER;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo objetivo no encontrado: ${filePath}`);
  }

  if (!pfxPath || !fs.existsSync(pfxPath)) {
    return {
      success: false,
      skipped: true,
      reason: 'No se suministró certificado PFX válido en AUTHENTICODE_PFX_PATH.',
      verification: verifySignature(filePath),
    };
  }

  // Firmar usando script de PowerShell con manejo seguro de credencial
  const escapedFilePath = filePath.replace(/'/g, "''");
  const escapedPfxPath = pfxPath.replace(/'/g, "''");
  const escapedTimestampServer = timestampServer.replace(/'/g, "''");

  let psScript = '';
  if (pfxPassword) {
    psScript = `
      $ErrorActionPreference = 'Stop'
      $pfxPass = ConvertTo-SecureString -String $env:SIGN_TEMP_PASS -AsPlainText -Force
      $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${escapedPfxPath}', $pfxPass)
      $sig = Set-AuthenticodeSignature -LiteralPath '${escapedFilePath}' -Certificate $cert -TimestampServer '${escapedTimestampServer}' -HashAlgorithm SHA256
      $sig.Status.ToString()
    `;
  } else {
    psScript = `
      $ErrorActionPreference = 'Stop'
      $cert = Get-PfxCertificate -FilePath '${escapedPfxPath}'
      $sig = Set-AuthenticodeSignature -LiteralPath '${escapedFilePath}' -Certificate $cert -TimestampServer '${escapedTimestampServer}' -HashAlgorithm SHA256
      $sig.Status.ToString()
    `;
  }

  const env = { ...process.env, SIGN_TEMP_PASS: pfxPassword };
  const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
    encoding: 'utf8',
    env,
  });

  const verification = verifySignature(filePath);
  const success = verification.status === 'Valid';

  return {
    success,
    skipped: false,
    output: (res.stdout || res.stderr || '').trim(),
    verification,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only') || args.includes('--verify');
  const asJson = args.includes('--json');
  const strict = args.includes('--strict');

  const targetFiles = args.filter((a) => !a.startsWith('--'));

  // Archivos por defecto si no se especifican
  const defaultTargets = [
    path.resolve(__dirname, '../release/CEPRO_MICAELA_2.0_Setup_QA_x64.exe'),
    path.resolve(__dirname, '../release/CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe'),
    path.resolve(__dirname, '../release/CEPRO_MICAELA_2.0-win32-x64/CEPRO_MICAELA_2.0.exe'),
    path.resolve(__dirname, '../release/CEPRO_MICAELA_2.0_Institucional-win32-x64/CEPRO_MICAELA_2.0.exe'),
  ];

  const filesToCheck = targetFiles.length > 0
    ? targetFiles.map((f) => path.resolve(process.cwd(), f))
    : defaultTargets.filter((f) => fs.existsSync(f));

  if (filesToCheck.length === 0) {
    console.log('[SIGN-TOOL] No se encontraron archivos para verificar o firmar.');
    process.exit(0);
  }

  const results = [];

  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) {
      console.warn(`[SIGN-TOOL] Archivo omitido (no existe): ${file}`);
      continue;
    }

    if (verifyOnly || !process.env.AUTHENTICODE_PFX_PATH) {
      const ver = verifySignature(file);
      results.push({
        action: 'verify',
        file: path.relative(path.resolve(__dirname, '..'), file),
        ...ver,
      });
    } else {
      const signRes = signFile(file);
      results.push({
        action: 'sign',
        file: path.relative(path.resolve(__dirname, '..'), file),
        success: signRes.success,
        ...signRes.verification,
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n========================================================================');
    console.log('   REPORTE DE ESTADO AUTHENTICODE — CEPRO_MICAELA 2.0 (OBS-41B-01)      ');
    console.log('========================================================================\n');
    console.log(`  Certificado PFX: ${process.env.AUTHENTICODE_PFX_PATH || 'NO SUMINISTRADO (Modo Auditoría / NotSigned)'}`);
    console.log(`  Servidor RFC 3161: ${process.env.AUTHENTICODE_TIMESTAMP_SERVER || DEFAULT_TIMESTAMP_SERVER}\n`);

    for (const r of results) {
      console.log(`• Archivo: ${r.file}`);
      console.log(`  SHA-256:  ${r.sha256}`);
      console.log(`  Estado:   ${r.status} ${r.status === 'NotSigned' ? '(Sin firma digital formal — Apto para QA/Staging)' : ''}`);
      if (r.signerSubject) {
        console.log(`  Firmante: ${r.signerSubject}`);
      }
      if (r.timeStamperSubject) {
        console.log(`  Timestamp:${r.timeStamperSubject}`);
      }
      console.log('------------------------------------------------------------------------');
    }
  }

  if (strict) {
    const invalid = results.some((r) => r.status !== 'Valid');
    if (invalid) {
      console.error('[SIGN-TOOL] Fallo en modo estricto: Existen archivos no firmados o inválidos.');
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  calculateSha256,
  verifySignature,
  signFile,
};
