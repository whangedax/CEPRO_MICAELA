const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve('C:/CETPRO/CETPRO_MODERNIZACION_V2');
const htmlPath = path.join(BASE_DIR, 'informes_senati/INFORME_PRACTICA_SENATI_GONSALO_GUZMAN.html');
const fotosDir = path.join(BASE_DIR, 'fotos_estudiante');

function fileToBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${data.toString('base64')}`;
}

const b64Foto1 = fileToBase64(path.join(fotosDir, 'foto1_operacion_sistema.jpg'));
const b64Foto2 = fileToBase64(path.join(fotosDir, 'foto2_instalador_progreso.jpg'));
const b64Foto3 = fileToBase64(path.join(fotosDir, 'foto3_instalador_finalizado.jpg'));

console.log('Cargadas 3 fotos en base64.');

let html = fs.readFileSync(htmlPath, 'utf8');

// Target the old photo-container on Page 14
const oldPhotoContainerRegex = /<!-- SECCI[ÓO]N APARTADA Y ENMARCADA PARA LA FOTO DEL ESTUDIANTE -->\s*<div class="photo-container">[\s\S]*?<\/div>\s*<\/div>\s*<div class="footer">/i;

const newPhotoSection = `<!-- SECCIÓN DE EVIDENCIA FOTOGRÁFICA DEL ESTUDIANTE EN LA EMPRESA -->
    <div style="border: 2px solid #002b66; border-radius: 6px; padding: 7px 9px; background: #ffffff; margin-top: 6px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #002b66; padding-bottom: 3px; margin-bottom: 5px;">
        <span style="font-size: 10px; font-weight: bold; color: #002b66; letter-spacing: 0.5px;">
          ESPACIO DE EVIDENCIA FOTOGRÁFICA DEL ESTUDIANTE EN LA EMPRESA
        </span>
        <span style="font-size: 8px; font-weight: bold; color: #002b66; background: #eef3f9; padding: 2px 6px; border-radius: 3px;">
          GONSALO GUZMAN JORDAN &bull; ID: 001499194
        </span>
      </div>

      <div style="display: flex; gap: 7px; justify-content: space-between;">
        <!-- Foto 1: Extracción / Progreso -->
        <div style="flex: 1; border: 1px solid #b0c0d0; border-radius: 4px; overflow: hidden; background: #fafbfc; padding: 3px;">
          <img src="${b64Foto2}" style="width: 100%; height: 42mm; object-fit: cover; border-radius: 2px; display: block;" />
          <div style="padding: 3px 2px 1px 2px; font-size: 7.2px; line-height: 1.25; color: #222;">
            <strong style="color: #002b66;">Foto 1: Extracción e Instalador</strong><br>
            Ejecución y extracción de binarios con Inno Setup en la estación de trabajo física.
          </div>
        </div>

        <!-- Foto 2: Finalización del Despliegue -->
        <div style="flex: 1; border: 1px solid #b0c0d0; border-radius: 4px; overflow: hidden; background: #fafbfc; padding: 3px;">
          <img src="${b64Foto3}" style="width: 100%; height: 42mm; object-fit: cover; border-radius: 2px; display: block;" />
          <div style="padding: 3px 2px 1px 2px; font-size: 7.2px; line-height: 1.25; color: #222;">
            <strong style="color: #002b66;">Foto 2: Despliegue Completado</strong><br>
            Verificación de término de instalación de CEPRO MICAELA 2.0 y comprobación de accesos.
          </div>
        </div>

        <!-- Foto 3: Operación en Secretaría -->
        <div style="flex: 1; border: 1px solid #b0c0d0; border-radius: 4px; overflow: hidden; background: #fafbfc; padding: 3px;">
          <img src="${b64Foto1}" style="width: 100%; height: 42mm; object-fit: cover; border-radius: 2px; display: block;" />
          <div style="padding: 3px 2px 1px 2px; font-size: 7.2px; line-height: 1.25; color: #222;">
            <strong style="color: #002b66;">Foto 3: Operación en Secretaría</strong><br>
            Validación funcional de la interfaz de Secretaría Académica operando en modo offline.
          </div>
        </div>
      </div>

      <div style="margin-top: 5px; padding: 3px 6px; background: #f0f5fa; border-left: 3px solid #002b66; font-size: 7.6px; line-height: 1.25; color: #002b66;">
        <strong>Constatación técnica presencial:</strong> Se certifica la presencia y participación activa del estudiante <strong>Gonsalo Guzman Jordan</strong> ejecutando la tarea más significativa: compilación, empaquetado desktop y validación operativa del sistema en el CETPRO Micaela Bastidas.
      </div>
    </div>
  </div>

  <div class="footer">`;

if (oldPhotoContainerRegex.test(html)) {
  html = html.replace(oldPhotoContainerRegex, newPhotoSection);
  console.log('✓ Sección de fotos reemplazada exitosamente en HTML.');
} else {
  console.error('No se pudo encontrar la sección antigua de foto en HTML con regex.');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ HTML guardado en:', htmlPath);
