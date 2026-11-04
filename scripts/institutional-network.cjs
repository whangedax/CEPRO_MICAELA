/**
 * scripts/institutional-network.cjs
 *
 * Módulo Central de Red Institucional Offline — CEPRO_MICAELA 2.0.
 * Implementa la topología en estrella centrada en el Equipo Maestro (Dirección),
 * el censo de las 13 cuentas oficiales 2026, generación de kits de instalación,
 * vinculación de equipos, intercambio estructurado USB (CEPRO_INTERCAMBIO/),
 * escaneo e importación por lotes con respaldo automático SQLite y revocación de equipos.
 *
 * Cumple estrictamente con las 13 garantías adversariales (G01 a G13) especificadas
 * en docs/contracts/RED_INSTITUCIONAL_OFFLINE_CONTRATOS.md.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const APP_NAME = 'CETPRO_MICAELA';
const INVITATION_TYPE = 'NETWORK_INVITATION';
const CANONICAL_INSTALLER_SHA256 = 'AE13991D55F5C2A2EF7654DA699D2BB4AA33C898EEAB0CBD673FE738C18D17DF';

const USB_BASE_DIR = 'CEPRO_INTERCAMBIO';
const SUBDIR_TO_DIRECTION = 'para-direccion';
const SUBDIR_TO_SECRETARIA = 'para-secretaria';
const SUBDIR_TO_DOCENTES = 'para-docentes';
const SUBDIR_PROCESSED = 'procesados';

const canonical = (value) => JSON.stringify(value ?? null);
const hash = (value) => crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const fail = (message, status = 400) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};

const pem = (key, type) => key.export({ type, format: 'pem' });
const pair = (algorithm) => {
  const k = crypto.generateKeyPairSync(algorithm);
  return { public: pem(k.publicKey, 'spki'), private: pem(k.privateKey, 'pkcs8') };
};

const sign = (value, privateKey) => crypto.sign(null, Buffer.from(canonical(value)), privateKey).toString('base64');
const verify = (value, signature, publicKey) => {
  try {
    return crypto.verify(null, Buffer.from(canonical(value)), publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
};

/**
 * Asegura la estructura de directorios en una memoria USB o directorio local.
 */
function ensureUsbStructure(usbRoot) {
  const base = path.join(usbRoot, USB_BASE_DIR);
  const toDirection = path.join(base, SUBDIR_TO_DIRECTION);
  const toSecretaria = path.join(base, SUBDIR_TO_SECRETARIA);
  const toDocentes = path.join(base, SUBDIR_TO_DOCENTES);
  const processed = path.join(base, SUBDIR_PROCESSED);

  fs.mkdirSync(toDirection, { recursive: true });
  fs.mkdirSync(toSecretaria, { recursive: true });
  fs.mkdirSync(toDocentes, { recursive: true });
  fs.mkdirSync(processed, { recursive: true });

  const readmePath = path.join(base, 'LEAME_RED.txt');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = [
      '========================================================================',
      ' CEPRO_MICAELA 2.0 — CARPETA DE INTERCAMBIO OFFLINE USB',
      '========================================================================',
      '',
      'Esta carpeta contiene los paquetes de actualización académica institucional.',
      'Estructura de intercambio:',
      '  - /para-direccion   : Avances de docentes y secretaría hacia el Director.',
      '  - /para-secretaria  : Actualizaciones de matrículas y actas hacia Secretaría.',
      '  - /para-docentes    : Nóminas y asignaciones enviadas a cada docente.',
      '  - /procesados       : Historial de lotes ya integrados en el sistema.',
      '',
      'AVISO DE SEGURIDAD: Todos los archivos .cetpro están firmados digitalmente.',
      'No modifique ni renombre manualmente los archivos.',
      '========================================================================'
    ].join('\r\n');
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
  }

  return { base, toDirection, toSecretaria, toDocentes, processed };
}

/**
 * 1. createKit: Genera un kit de instalación offline para un docente o secretaria.
 */
function createKit(core, actor, input, rootDir = process.cwd()) {
  core.requireRole(actor, ['DIRECTOR']);

  if (!core.setting('authorityPrivate')) {
    fail('Solo el Equipo Maestro institucional con clave de autoridad puede generar kits de instalación.', 403);
  }

  const userId = input?.userId;
  if (!userId) fail('Indique el usuario destinatario para el kit.');

  const targetUser = core.user(userId);
  if (!targetUser || !targetUser.active) fail('Usuario no encontrado o inactivo.');

  if (targetUser.role === 'DIRECTOR') {
    fail('El Director opera en el Equipo Maestro institucional; no requiere kit.', 400);
  }

  const expiryDays = Number(input?.expiryDays || 7);
  if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 30) {
    fail('El periodo de expiración debe ser entre 1 y 30 días.');
  }

  const issuedAt = now();
  const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();
  const institution = core.setting('institution');
  if (!institution) fail('Institución no inicializada en este equipo.', 400);

  const hubDevice = core.setting('device');

  // Generar par criptográfico para el dispositivo satélite
  const devicePair = {
    id: id(),
    signing: pair('ed25519'),
    encryption: pair('x25519')
  };

  const recipientUser = {
    id: targetUser.id,
    username: targetUser.username,
    name: targetUser.name,
    role: targetUser.role,
    assignments: targetUser.assignments || [],
    version: targetUser.version || 1,
    active: targetUser.active !== false
  };

  // Crear y firmar el certificado de autorización institucional para este dispositivo
  const certBody = {
    institutionId: institution.id,
    deviceId: devicePair.id,
    signingKey: devicePair.signing.public,
    encryptionKey: devicePair.encryption.public,
    user: recipientUser,
    validUntil: expiresAt
  };

  const deviceCertificate = {
    body: certBody,
    signature: sign(certBody, core.setting('authorityPrivate'))
  };

  // Registrar el dispositivo en la lista de confianza del Hub
  const devicesList = (core.setting('devices') || []).filter(d => d.userId !== targetUser.id);
  devicesList.push({
    id: devicePair.id,
    userId: targetUser.id,
    signingKey: devicePair.signing.public,
    encryptionKey: devicePair.encryption.public,
    name: targetUser.name
  });
  core.setting('devices', devicesList);

  const invitationBody = {
    app: APP_NAME,
    type: INVITATION_TYPE,
    version: 1,
    id: id(),
    institution: {
      id: institution.id,
      name: institution.name,
      publicKey: institution.publicKey,
      hub: {
        id: hubDevice.id,
        signingKey: hubDevice.signing.public,
        encryptionKey: hubDevice.encryption.public
      }
    },
    recipient: recipientUser,
    device: devicePair,
    certificate: deviceCertificate,
    issuedAt,
    expiresAt,
    installerSha256: CANONICAL_INSTALLER_SHA256
  };

  const signature = sign(invitationBody, core.setting('authorityPrivate'));
  const invitation = { body: invitationBody, signature };

  const sanitizedRole = targetUser.role.toLowerCase();
  const sanitizedName = (targetUser.name || targetUser.username).replace(/[^a-zA-Z0-9_-]/g, '_');
  const folderName = `KIT_CEPRO_${sanitizedRole.toUpperCase()}_${sanitizedName}`;

  let kitDirectory;
  if (input?.targetPath) {
    kitDirectory = path.join(input.targetPath, folderName);
  } else {
    kitDirectory = path.join(core.directory, 'kits', folderName);
  }
  fs.mkdirSync(kitDirectory, { recursive: true });

  const invitationFile = path.join(kitDirectory, 'invitacion.cetpro-invitacion');
  fs.writeFileSync(invitationFile, JSON.stringify(invitation, null, 2), 'utf8');

  const instructionsFile = path.join(kitDirectory, 'LEAME_INSTALACION.txt');
  const instructions = [
    '========================================================================',
    ` KIT DE INSTALACIÓN OFFLINE — CETPRO "MICAELA BASTIDAS" (AÑO 2026)`,
    '========================================================================',
    `Destinatario : ${targetUser.name} (${targetUser.role})`,
    `Usuario      : ${targetUser.username}`,
    `Fecha emisión: ${issuedAt}`,
    `Caducidad    : ${expiresAt} (${expiryDays} días de vigencia)`,
    '========================================================================',
    '',
    'PASOS PARA CONFIGURAR SU EQUIPO EN 3 MINUTOS:',
    '1. Si no tiene el programa instalado, ejecute el instalador oficial:',
    '   CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe',
    '2. Abra el aplicativo CEPRO_MICAELA 2.0 en su computadora.',
    '3. En la pantalla de bienvenida, arrastre o seleccione el archivo:',
    '   "invitacion.cetpro-invitacion" que acompaña esta carpeta.',
    '4. Inicie sesión con su usuario y contraseña institucional autorizada.',
    '',
    'IMPORTANTE: Esta invitación es personal, intransferible y está firmada',
    'por la Dirección del CETPRO. Caduca automáticamente en la fecha indicada.',
    '========================================================================'
  ].join('\r\n');
  fs.writeFileSync(instructionsFile, instructions, 'utf8');

  let installerCopied = false;
  const officialInstaller = path.join(rootDir, 'release', 'CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe');
  if (fs.existsSync(officialInstaller) && input?.targetPath) {
    try {
      const destInstaller = path.join(kitDirectory, 'CEPRO_MICAELA_2.0_Setup_Institucional_x64.exe');
      fs.copyFileSync(officialInstaller, destInstaller);
      installerCopied = true;
    } catch {
      installerCopied = false;
    }
  }

  core.audit('KIT_CREATED', actor, {
    userId: targetUser.id,
    invitationId: invitationBody.id,
    expiresAt,
    kitDirectory
  });

  return {
    success: true,
    kitDirectory,
    invitationFile,
    instructionsFile,
    installerCopied,
    invitation,
    expiresAt
  };
}

/**
 * 2. validateInvitation: Valida firma, vigencia y compatibilidad de una invitación.
 */
function validateInvitation(core, invitationPackage) {
  if (!invitationPackage?.body || !invitationPackage?.signature) {
    fail('El paquete de invitación no tiene formato válido.');
  }

  const b = invitationPackage.body;
  if (b.app !== APP_NAME || b.type !== INVITATION_TYPE) {
    fail('El archivo no es una invitación de Red Institucional CETPRO.');
  }

  const isExpired = new Date() > new Date(b.expiresAt);
  if (isExpired) {
    fail(`La invitación institucional ha caducado el ${b.expiresAt}. Solicite una nueva a Dirección.`, 400);
  }

  const isValid = verify(b, invitationPackage.signature, b.institution?.publicKey);
  if (!isValid) {
    fail('Firma institucional de la invitación inválida o corrupta.', 403);
  }

  if (core.status().authority) {
    fail('Este equipo ya está configurado como Equipo Maestro (Hub).', 409);
  }

  const currentInst = core.setting('institution');
  if (currentInst && currentInst.id !== b.institution.id) {
    fail('El equipo ya pertenece a otra institución.', 409);
  }

  return {
    valid: true,
    institution: {
      id: b.institution.id,
      name: b.institution.name
    },
    recipient: {
      id: b.recipient.id,
      username: b.recipient.username,
      name: b.recipient.name,
      role: b.recipient.role
    },
    issuedAt: b.issuedAt,
    expiresAt: b.expiresAt,
    isExpired: false,
    installerSha256: b.installerSha256
  };
}

/**
 * 3. acceptInvitationAndLink: Vincula el equipo local al usuario y la institución.
 */
function acceptInvitationAndLink(core, input) {
  validateInvitation(core, input?.invitation);
  const b = input.invitation.body;

  const existingCert = core.setting('certificate');
  if (existingCert && existingCert.body?.user?.id !== b.recipient.id) {
    fail(`El equipo ya está vinculado al usuario ${existingCert.body.user.username}. Solicite reemplazo a Dirección.`, 409);
  }

  core.setting('institution', b.institution);

  let d = core.setting('device');
  if (b.device) {
    core.setting('device', b.device);
    d = b.device;
  }

  let cert = b.certificate;
  if (!cert) {
    const certBody = {
      institutionId: b.institution.id,
      deviceId: d.id,
      signingKey: d.signing.public,
      encryptionKey: d.encryption.public,
      user: b.recipient,
      validUntil: b.expiresAt
    };
    cert = {
      body: certBody,
      signature: input.invitation.signature
    };
  }

  core.setting('certificate', cert);
  core.setting('provisionSequence', 1);

  const recipientUser = {
    ...b.recipient,
    version: b.recipient.version || 1,
    active: b.recipient.active !== false
  };
  core.putUser(recipientUser);

  core.audit('DEVICE_LINKED_INVITATION', b.recipient, {
    deviceId: d.id,
    invitationId: b.id
  });

  return {
    success: true,
    linkedUser: {
      id: b.recipient.id,
      username: b.recipient.username,
      name: b.recipient.name,
      role: b.recipient.role
    },
    deviceId: d.id
  };
}

/**
 * 4. getNetworkStatus: Censo de las 13 cuentas oficiales 2026, métricas y semáforos.
 */
function getNetworkStatus(core, actor) {
  const isHub = !!core.setting('authorityPrivate');
  const currentDeviceId = core.setting('device').id;
  const nodeRole = isHub
    ? 'HUB_MASTER'
    : (actor?.role === 'SECRETARIA' ? 'SECRETARIA_NODE' : 'DOCENTE_NODE');

  const inst = core.setting('institution') || {
    id: '',
    name: 'CETPRO Micaela Bastidas',
    code: '1027648',
    publicKey: ''
  };

  const allUsers = core.users();
  const devicesList = core.setting('devices') || [];
  const revokedList = core.setting('revokedDevices') || [];
  const deliveriesRows = core.db.prepare('SELECT deviceId, operationId, acknowledged FROM deliveries').all();

  const confirmedByDevice = new Map();
  for (const row of deliveriesRows) {
    if (row.acknowledged === 1) {
      if (!confirmedByDevice.has(row.deviceId)) confirmedByDevice.set(row.deviceId, new Set());
      confirmedByDevice.get(row.deviceId).add(row.operationId);
    }
  }

  const hasExternalLinkedDevices = isHub && devicesList.some((d) => d.id !== currentDeviceId);
  const allOps = hasExternalLinkedDevices ? core.operations() : [];
  const vCache = hasExternalLinkedDevices && typeof core.buildVisibilityCache === 'function' ? core.buildVisibilityCache() : null;

  let upToDateCount = 0;
  let pendingCount = 0;
  let staleCount = 0;
  let unlinkedCount = 0;
  let revokedCount = 0;

  const accounts = allUsers.map((u) => {
    const linkedDevice = devicesList.find((d) => d.userId === u.id);
    const isRevoked = revokedList.some((r) => r.userId === u.id || (linkedDevice && r.deviceId === linkedDevice.id));
    const revocation = revokedList.find((r) => r.userId === u.id || (linkedDevice && r.deviceId === linkedDevice.id));

    const confirmed = linkedDevice && confirmedByDevice.has(linkedDevice.id)
      ? confirmedByDevice.get(linkedDevice.id)
      : new Set();

    const uScopeCache = vCache && typeof core.getUserScopeCache === 'function' ? core.getUserScopeCache(u, vCache) : null;
    const pendingChangesCount = isHub && linkedDevice && linkedDevice.id !== currentDeviceId && !isRevoked
      ? allOps.filter((op) => !confirmed.has(op.body.id) && core.operationVisible(u, op.body, uScopeCache)).length
      : 0;

    const unackCount = linkedDevice
      ? deliveriesRows.filter((d) => d.deviceId === linkedDevice.id && d.acknowledged === 0).length
      : 0;

    let lastSyncReceivedAt = null;
    let daysSinceLastSync = null;

    if (linkedDevice) {
      const auditRows = core.db.prepare('SELECT value FROM audit WHERE value LIKE ? ORDER BY rowid DESC LIMIT 1')
        .all(`%"userId":"${u.id}"%`);
      if (auditRows.length > 0) {
        try {
          const parsed = JSON.parse(auditRows[0].value);
          lastSyncReceivedAt = parsed.at || null;
          if (lastSyncReceivedAt) {
            daysSinceLastSync = Math.max(0, Math.floor((Date.now() - new Date(lastSyncReceivedAt).getTime()) / 86400000));
          }
        } catch {}
      }
    }

    let statusColor = 'GRAY';
    let statusLabel = 'Sin Vincular';

    if (isRevoked) {
      statusColor = 'RED';
      statusLabel = 'Equipo Revocado';
      revokedCount++;
    } else if (!linkedDevice) {
      statusColor = 'GRAY';
      statusLabel = 'Sin Vincular';
      unlinkedCount++;
    } else if (daysSinceLastSync !== null && daysSinceLastSync > 7) {
      statusColor = 'RED';
      statusLabel = `Desactualizado (${daysSinceLastSync}d)`;
      staleCount++;
    } else if (pendingChangesCount > 0 || (daysSinceLastSync !== null && daysSinceLastSync >= 3)) {
      statusColor = 'YELLOW';
      statusLabel = pendingChangesCount > 0 ? `${pendingChangesCount} cambios pendientes` : `Pendiente (${daysSinceLastSync || 0}d)`;
      pendingCount++;
    } else {
      statusColor = 'GREEN';
      statusLabel = 'Al Día';
      upToDateCount++;
    }

    const programs = core.records('programs') || [];
    const carreras = (u.assignments || []).map((a) => {
      const prog = programs.find((p) => p.id === a.programId);
      return prog ? prog.nombre : a.programId;
    }).filter(Boolean);

    return {
      id: u.id,
      userId: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      active: u.active,
      version: u.version || 1,
      assignments: u.assignments || [],
      assignmentsCount: (u.assignments || []).length,
      carreras: [...new Set(carreras)],
      device: {
        linked: !!linkedDevice,
        deviceId: linkedDevice ? linkedDevice.id : null,
        linkedAt: linkedDevice ? linkedDevice.linkedAt || null : null,
        signingKey: actor?.role === 'DIRECTOR' && linkedDevice ? linkedDevice.signingKey : null,
        revoked: isRevoked,
        revokedAt: revocation ? revocation.revokedAt : null,
        revocationReason: revocation ? revocation.reason : null
      },
      isLinked: !!linkedDevice,
      deviceId: linkedDevice ? linkedDevice.id : null,
      certificateStatus: isRevoked ? 'EXPIRED' : (linkedDevice ? 'ACTIVE' : 'UNLINKED'),
      validUntil: linkedDevice ? linkedDevice.linkedAt : null,
      isExpired: isRevoked,
      statusTrafficLight: statusColor,
      syncMetrics: {
        lastSyncSentAt: null,
        lastSyncReceivedAt,
        daysSinceLastSync,
        unacknowledgedDeliveries: unackCount,
        pendingChangesCount
      },
      statusColor,
      statusLabel
    };
  });

  const summary = {
    totalAccounts: allUsers.length,
    linkedDevicesCount: devicesList.length,
    unlinkedCount,
    upToDateCount,
    pendingCount,
    staleCount,
    revokedCount
  };

  const metrics = {
    totalAccounts: allUsers.length,
    linkedAccounts: devicesList.length,
    activeAccounts: allUsers.filter((u) => u.active).length,
    pendingKits: unlinkedCount
  };

  return {
    appName: APP_NAME,
    isHub,
    authorityPresent: isHub,
    deviceId: currentDeviceId,
    hubDeviceId: isHub ? currentDeviceId : (inst.hub?.id || ''),
    currentDeviceId,
    nodeRole,
    institution: {
      id: inst.id,
      name: inst.name,
      code: '1027648',
      publicKey: inst.publicKey
    },
    summary,
    metrics,
    devices: devicesList.map((d) => ({ id: d.id, name: d.id.slice(0, 8), userId: d.userId, signingKey: d.signingKey })),
    revokedDevices: revokedList,
    accounts
  };
}

/**
 * 5. prepareBatchExport: Genera paquetes de sincronización y los escribe atómicamente (.tmp -> .cetpro).
 */
function prepareBatchExport(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR', 'SECRETARIA', 'DOCENTE']);

  const usbRoot = input?.usbDrivePath || path.join(core.directory, 'usb-intercambio');
  const dirs = ensureUsbStructure(usbRoot);
  const packages = [];
  let totalOperations = 0;

  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const dateStamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;

  const isSatellite = !core.setting('authorityPrivate') || actor.role === 'DOCENTE';

  if (isSatellite) {
    // NODO SATÉLITE (DOCENTE o SECRETARIA) exporta hacia Dirección
    const targetFolder = dirs.toDirection;
    const fileName = `${dateStamp}_DE-${actor.username}_HACIA-DIRECCION_lote-01.cetpro`;
    const tempFile = path.join(targetFolder, `${fileName}.tmp_${id().slice(0, 8)}`);
    const finalFile = path.join(targetFolder, fileName);

    let pkg;
    const hubId = core.setting('institution')?.hub?.id;
    if (hubId && core.setting('certificate')) {
      pkg = core.packageFor(actor, hubId);
    } else {
      pkg = core.exchangePackage(actor, { passphrase: input?.passphrase || 'CETPRO_2026' });
    }

    const payload = canonical(pkg);
    const expectedSha = hash(payload);
    fs.writeFileSync(tempFile, payload, 'utf8');

    const writtenSha = hash(fs.readFileSync(tempFile, 'utf8'));
    if (writtenSha !== expectedSha) {
      fs.unlinkSync(tempFile);
      fail('Error de integridad al escribir en el medio de almacenamiento.', 500);
    }

    fs.renameSync(tempFile, finalFile);

    const opsCount = pkg.body?.operations?.length || 0;
    totalOperations += opsCount;

    packages.push({
      recipientUserId: 'DIRECCION',
      recipientName: 'Dirección Institucional',
      recipientRole: 'DIRECTOR',
      targetFolder: 'para-direccion',
      fileName,
      filePath: finalFile,
      operationsCount: opsCount,
      packageId: pkg.body?.id || id(),
      sha256: expectedSha
    });
  } else {
    // DIRECTOR o SECRETARIA exporta hacia Docentes
    const allUsers = core.users().filter((u) => u.active && u.role === 'DOCENTE');
    const recipientIds = input?.recipientUserIds && input.recipientUserIds.length > 0
      ? input.recipientUserIds
      : allUsers.map((u) => u.id);

    const targetUsers = allUsers.filter((u) => recipientIds.includes(u.id));
    const devicesList = core.setting('devices') || [];

    for (const targetDocente of targetUsers) {
      const docenteFolder = path.join(dirs.toDocentes, targetDocente.username);
      fs.mkdirSync(docenteFolder, { recursive: true });

      const fileName = `${dateStamp}_DE-${actor.username}_HACIA-${targetDocente.username}_lote-01.cetpro`;
      const tempFile = path.join(docenteFolder, `${fileName}.tmp_${id().slice(0, 8)}`);
      const finalFile = path.join(docenteFolder, fileName);

      let pkg;
      const linkedDev = devicesList.find((dev) => dev.userId === targetDocente.id);
      if (linkedDev) {
        pkg = core.packageFor(actor, linkedDev.id);
      } else {
        const docenteGroupIds = (targetDocente.assignments || []).map((a) => a.groupId);
        pkg = core.exchangePackage(actor, {
          groupId: docenteGroupIds[0],
          passphrase: input?.passphrase || 'CETPRO_2026'
        });
      }

      const payload = canonical(pkg);
      const expectedSha = hash(payload);
      fs.writeFileSync(tempFile, payload, 'utf8');

      const writtenSha = hash(fs.readFileSync(tempFile, 'utf8'));
      if (writtenSha !== expectedSha) {
        fs.unlinkSync(tempFile);
        fail('Error de integridad al escribir en el medio de almacenamiento.', 500);
      }

      fs.renameSync(tempFile, finalFile);

      const opsCount = pkg.body?.operations?.length || 0;
      totalOperations += opsCount;

      packages.push({
        recipientUserId: targetDocente.id,
        recipientName: targetDocente.name,
        recipientRole: targetDocente.role,
        targetFolder: `para-docentes/${targetDocente.username}`,
        fileName,
        filePath: finalFile,
        operationsCount: opsCount,
        packageId: pkg.body?.id || id(),
        sha256: expectedSha
      });
    }
  }

  return {
    success: true,
    targetRoot: usbRoot,
    totalPackages: packages.length,
    packagesCount: packages.length,
    usbPath: usbRoot,
    exchangeRoot: usbRoot,
    totalOperations,
    packages
  };
}

/**
 * 6. scanUsb: Localiza y previsualiza paquetes (.cetpro) sin escribir en SQLite (dry-run).
 */
function scanUsb(core, actor, input) {
  const usbRoot = input?.usbDrivePath;
  if (!usbRoot || !fs.existsSync(usbRoot)) {
    fail('Ruta de USB no válida o inaccesible.');
  }

  const exchangeRoot = path.join(usbRoot, USB_BASE_DIR);
  if (!fs.existsSync(exchangeRoot)) {
    return {
      usbPath: usbRoot,
      exchangeRoot,
      scannedFilesCount: 0,
      pendingToImportCount: 0,
      packages: []
    };
  }

  const targetDirs = [];
  if (actor.role === 'DIRECTOR') {
    targetDirs.push(path.join(exchangeRoot, SUBDIR_TO_DIRECTION));
    targetDirs.push(exchangeRoot);
  } else if (actor.role === 'SECRETARIA') {
    targetDirs.push(path.join(exchangeRoot, SUBDIR_TO_SECRETARIA));
    targetDirs.push(path.join(exchangeRoot, SUBDIR_TO_DIRECTION));
  } else {
    // DOCENTE
    targetDirs.push(path.join(exchangeRoot, SUBDIR_TO_DOCENTES, actor.username));
    targetDirs.push(path.join(exchangeRoot, SUBDIR_TO_DOCENTES));
  }

  const filesFound = [];
  for (const d of targetDirs) {
    if (fs.existsSync(d)) {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isFile() && ent.name.endsWith('.cetpro') && !ent.name.includes('.tmp')) {
          filesFound.push({
            dir: d,
            fileName: ent.name,
            fullPath: path.join(d, ent.name)
          });
        }
      }
    }
  }

  const packages = [];
  let pendingCount = 0;

  for (const item of filesFound) {
    try {
      const stat = fs.statSync(item.fullPath);
      if (stat.size > 16 * 1024 * 1024) {
        packages.push({
          fileName: item.fileName,
          filePath: item.fullPath,
          subFolder: path.basename(item.dir),
          packageType: 'ERROR',
          alreadyImported: false,
          hasWork: false,
          previewReport: { error: 'El archivo excede el límite máximo de 16 MB.', status: 413 }
        });
        continue;
      }
      const raw = fs.readFileSync(item.fullPath, 'utf8');
      const pkg = JSON.parse(raw);
      const pkgId = pkg.body?.id;

      const receipt = pkgId ? core.db.prepare('SELECT id FROM receipts WHERE id=?').get(pkgId) : null;
      const alreadyImported = !!receipt;

      let previewReport = null;
      try {
        previewReport = core.importPackage(actor, pkg, false, input?.passphrase);
      } catch (err) {
        previewReport = { error: err.message, status: err.status || 400 };
      }

      const hasWork = previewReport && !previewReport.error && !previewReport.duplicatePackage && ((previewReport.total || 0) > 0 || previewReport.hasWork);
      if (!alreadyImported && hasWork) {
        pendingCount++;
      }

      packages.push({
        fileName: item.fileName,
        filePath: item.fullPath,
        subFolder: path.basename(item.dir),
        packageType: pkg.body?.type || 'SYNC',
        fromDeviceId: pkg.body?.from || '',
        senderName: pkg.body?.certificate?.body?.user?.name || 'Desconocido',
        senderRole: pkg.body?.certificate?.body?.user?.role || 'DOCENTE',
        packageCreatedAt: pkg.body?.at || '',
        operationsCount: previewReport?.total || 0,
        alreadyImported,
        hasWork: !!hasWork,
        previewReport
      });
    } catch {
      // Ignorar archivos no conformes
    }
  }

  return {
    usbPath: usbRoot,
    exchangeRoot,
    scannedFilesCount: filesFound.length,
    pendingToImportCount: pendingCount,
    packages
  };
}

/**
 * 7. importBatch: Aplica los paquetes en SQLite con respaldo preventivo obligatorio y transacción.
 */
function importBatch(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR', 'SECRETARIA', 'DOCENTE']);

  const scan = scanUsb(core, actor, input);
  const toImport = input?.filePathsToImport && input.filePathsToImport.length > 0
    ? scan.packages.filter((p) => input.filePathsToImport.includes(p.filePath))
    : scan.packages.filter((p) => !p.alreadyImported && (!p.previewReport || !p.previewReport.error));

  // Ordenamiento causal: DIRECTOR y SECRETARIA (estructura, alumnos, matrículas) preceden a DOCENTE (evaluaciones)
  const rolePriority = { DIRECTOR: 1, SECRETARIA: 2, DOCENTE: 3 };
  toImport.sort((a, b) => {
    const pA = rolePriority[a.senderRole] || 99;
    const pB = rolePriority[b.senderRole] || 99;
    return pA - pB;
  });

  if (toImport.length === 0) {
    return {
      success: true,
      backupCreated: '',
      totalFiles: 0,
      importedFilesCount: 0,
      failedFilesCount: 0,
      results: []
    };
  }

  // Respaldo preventivo obligatorio SQLite
  const backup = core.createBackup(actor, 'antes-sincronizar-lote');
  const results = [];
  let importedCount = 0;
  let failedCount = 0;

  const dirs = ensureUsbStructure(input.usbDrivePath);

  core.transaction(() => {
    for (const item of toImport) {
      try {
        const stat = fs.statSync(item.filePath);
        if (stat.size > 16 * 1024 * 1024) {
          fail('El archivo excede el límite máximo de 16 MB.', 413);
        }
        if (item.previewReport?.error) {
          fail(item.previewReport.error, item.previewReport.status || 400);
        }
        const raw = fs.readFileSync(item.filePath, 'utf8');
        const pkg = JSON.parse(raw);

        // Comprobación de revocación
        const revokedList = core.setting('revokedDevices') || [];
        const isSenderRevoked = revokedList.some((r) => r.deviceId === pkg.body?.from);
        if (isSenderRevoked) {
          fail('Equipo institucional revocado por extravío o seguridad.', 403);
        }

        const report = core.importPackage(actor, pkg, true, input?.passphrase);

        // Mover a procesados
        const pad = (n) => String(n).padStart(2, '0');
        const d = new Date();
        const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
        const baseName = item.fileName.replace(/\.cetpro$/, '');
        const processedFileName = `${baseName}_PROCESADO_${stamp}.cetpro`;
        const destPath = path.join(dirs.processed, processedFileName);

        try {
          fs.renameSync(item.filePath, destPath);
        } catch {
          // Si no se pudo renombrar, continuar
        }

        importedCount++;
        results.push({
          filePath: item.filePath,
          fileName: item.fileName,
          packageId: pkg.body?.id,
          success: true,
          applied: true,
          archivedTo: destPath,
          report
        });
      } catch (err) {
        failedCount++;
        results.push({
          filePath: item.filePath,
          fileName: item.fileName,
          packageId: '',
          success: false,
          applied: false,
          archivedTo: '',
          error: err.message
        });
      }
    }
  });

  core.audit('BATCH_SYNC_APPLIED', actor, {
    totalFiles: toImport.length,
    importedCount,
    failedCount
  });

  return {
    success: failedCount === 0,
    backupCreated: backup?.filename || 'antes-sincronizar-lote',
    totalFiles: toImport.length,
    importedFilesCount: importedCount,
    failedFilesCount: failedCount,
    results
  };
}

/**
 * 8. revokeDevice: Revoca el acceso de un equipo institucional por extravío o seguridad.
 */
function revokeDevice(core, actor, input) {
  core.requireRole(actor, ['DIRECTOR']);

  if (!core.setting('authorityPrivate')) {
    fail('Solo el Equipo Maestro puede revocar dispositivos.', 403);
  }

  const deviceId = input?.deviceId;
  if (!deviceId) fail('Indique el identificador del equipo a revocar.');

  const reason = String(input?.reason || '').trim();
  if (!reason) fail('Indique el motivo de la revocación del equipo.');

  const devices = core.setting('devices') || [];
  const targetDevice = devices.find((d) => d.id === deviceId);

  const revokedList = core.setting('revokedDevices') || [];
  if (!revokedList.some((r) => r.deviceId === deviceId)) {
    revokedList.push({
      deviceId,
      userId: targetDevice ? targetDevice.userId : null,
      revokedAt: now(),
      revokedBy: actor.id,
      reason
    });
    core.setting('revokedDevices', revokedList);
  }

  // Quitar de dispositivos activos
  core.setting('devices', devices.filter((d) => d.id !== deviceId));

  const affectedUser = targetDevice ? core.user(targetDevice.userId) : null;

  core.audit('DEVICE_REVOKED', actor, {
    deviceId,
    reason,
    userId: affectedUser?.id
  });

  return {
    success: true,
    revokedDeviceId: deviceId,
    revokedAt: now(),
    affectedUser: {
      id: affectedUser ? affectedUser.id : '',
      name: affectedUser ? affectedUser.name : 'Equipo sin asignar',
      role: affectedUser ? affectedUser.role : ''
    }
  };
}

/**
 * 9. replaceDevice: Sustituye formalmente un equipo averiado/sustituido y emite nuevo kit.
 */
function replaceDevice(core, actor, input, rootDir = process.cwd()) {
  core.requireRole(actor, ['DIRECTOR']);

  const oldDeviceId = input?.oldDeviceId;
  const userId = input?.userId;
  const reason = input?.reason || 'Reemplazo programado de equipo';

  if (oldDeviceId) {
    revokeDevice(core, actor, { deviceId: oldDeviceId, reason });
  }

  const kitResult = createKit(core, actor, {
    userId,
    targetPath: input?.newKitTargetPath,
    expiryDays: input?.expiryDays || 7
  }, rootDir);

  core.audit('DEVICE_REPLACED', actor, {
    oldDeviceId,
    userId,
    newInvitationId: kitResult.invitation.body.id
  });

  return {
    success: true,
    oldDeviceIdRevoked: oldDeviceId,
    kit: kitResult
  };
}

module.exports = {
  createKit,
  validateInvitation,
  acceptInvitationAndLink,
  getNetworkStatus,
  ensureUsbStructure,
  prepareBatchExport,
  scanUsb,
  importBatch,
  revokeDevice,
  replaceDevice,
  APP_NAME,
  INVITATION_TYPE,
  CANONICAL_INSTALLER_SHA256,
  USB_BASE_DIR,
  SUBDIR_TO_DIRECTION,
  SUBDIR_TO_SECRETARIA,
  SUBDIR_TO_DOCENTES,
  SUBDIR_PROCESSED
};
