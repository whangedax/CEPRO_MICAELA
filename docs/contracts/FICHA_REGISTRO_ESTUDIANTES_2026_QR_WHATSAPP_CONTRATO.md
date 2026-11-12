# CONTRATO DE ARQUITECTURA TÉCNICA: FICHA DE REGISTRO DE DATOS DE ESTUDIANTES 2026
## Captura Híbrida Digital (QR Inverso / WhatsApp Web / LAN) y Renderizado PDF de Alta Fidelidad

**Código de Documento:** `CTR-FICHA-REGISTRO-2026-QR-WA-01`  
**Estado:** VIGENTE / CONTRATO TÉCNICO NORMATIVO  
**Fecha de Emisión:** 11 de Noviembre de 2026  
**Área Responsable:** Arquitectura Técnica — CEPRO_MICAELA 2.0  
**Destinatarios:** Coordinador General, Ingeniero de Implementación Backend/Frontend, Auditor de Calidad QA  
**Plantilla Base Oficial:** `sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/FICHA  REGIST.. DE DAT  2026  MICAELA.pdf`  
**Mapeo Geométrico:** `app/data/FICHA_REGISTRO_2026_FIELDS.json` (A4 Vertical, 595.32 x 841.92 pt)

---

## 1. OBJETIVO Y CONTEXTO OPERATIVO

### 1.1. Propósito
Establecer el contrato técnico inquebrantable para la captura, validación, almacenamiento e impresión de la **Ficha de Registro de Datos de Estudiantes 2026** del CETPRO "Micaela Bastidas Puyucawa" (Puno / San Román).

El sistema erradica la doble digitación manual por parte de la Secretaría Institucional, permitiendo que el estudiante o apoderado complete sus datos en su propio teléfono móvil y los transmita a la computadora de Secretaría mediante un flujo híbrido ultra-resiliente diseñado para la realidad de conectividad de la institución.

### 1.2. Restricciones Físicas y Conectividad Híbrida
En las instalaciones del CETPRO:
1. **Escenario Actual (Cable Ethernet + WhatsApp Web):**
   - La computadora de Secretaría está conectada mediante cable de red Ethernet a un router local sin acceso a tarjeta Wi-Fi propia.
   - El estudiante en recepción utiliza sus propios datos móviles (o red exterior). Por tanto, la PC de Secretaría y el teléfono del estudiante **no comparten la misma subred IP**.
   - La Secretaría mantiene abierta su sesión de **WhatsApp Web** en el navegador para comunicarse con la comunidad educativa.
   - **Solución Primaria:** El formulario móvil del estudiante genera un **Mensaje Formateado de WhatsApp** que se envía al número oficial de Secretaría con un bloque firmado por CRC32, y/o proyecta un **Código QR Inverso** en la pantalla del celular que la Secretaría escanea con la cámara web de la PC o un lector de códigos de barra 2D.
2. **Escenario Evolutivo (Wi-Fi Local / Misma Red LAN):**
   - Cuando se incorpore un dongle Wi-Fi USB a la PC de Secretaría o el estudiante se conecte a la red Wi-Fi de la institución, el servidor local de CEPRO_MICAELA expone un endpoint HTTP acotado para envío directo sin intermediarios.

---

## 2. ESTRUCTURA CANÓNICA DE DATOS (`StudentProfile2026`)

El esquema unificado agrupa los **7 campos institucionales / de carrera** y los **27 campos personales y socioeducativos del estudiante**:

```typescript
export interface InstitutionalContext2026 {
  // 1. Código o número correlativo de inscripción (ej. "INS-2026-0042")
  codigoInscripcion?: string;
  // 2. Correo oficial institucional (default: "cetpromicaelabastidas@gmail.com")
  correoInstitucional: string;
  // 3. Sitio web institucional (default: "www.cetpromicaelabastidas.edu.pe")
  paginaWeb: string;
  // 4. Denominación del programa de estudios (ej. "PELUQUERÍA Y BARBERÍA")
  programaEstudios: string;
  // 5. Nivel oficial MINEDU (default: "AUXILIAR TÉCNICO")
  nivelFormativo: string;
  // 6. Módulo formativo o especialidad (ej. "Corte de Cabellos, Peinados y Diseño de Barbas")
  especialidad: string;
  // 7. Turno de estudios ("MAÑANA" | "TARDE" | "NOCHE")
  turno: 'MAÑANA' | 'TARDE' | 'NOCHE';
}

export interface StudentProfile2026 {
  // --- IDENTIFICACIÓN BÁSICA ---
  // 1. Apellido paterno
  apellidoPaterno: string;
  // 2. Apellido materno
  apellidoMaterno: string;
  // 3. Nombres completos
  nombres: string;
  // 4. Sexo biológico oficial
  sexo: 'F' | 'M';
  // 5. Fecha de nacimiento ISO 8601 (YYYY-MM-DD)
  fechaNacimiento: string;
  // 6. Documento Nacional de Identidad (DNI 8 dígitos) o CE
  documentoIdentidad: string;
  // 7. Edad calculada al momento de la matrícula
  edad: number;
  // 8. País de nacionalidad (default: "PERU")
  pais: string;

  // --- ORIGEN Y RESIDENCIA ---
  // 9. Lugar de nacimiento (Departamento / Provincia / Distrito)
  lugarNacimiento: string;
  // 10. Distrito de residencia actual
  distrito: string;
  // 11. Provincia de residencia actual (default: "SAN ROMÁN")
  provincia: string;
  // 12. Región / Departamento de residencia actual (default: "PUNO")
  region: string;
  // 13. Domicilio actual (Av. / Jr. / Calle / Barrio / Nro.)
  domicilio: string;

  // --- CONDICIÓN LABORAL ---
  // 14. Trabaja actualmente (true: SI, false: NO)
  trabaja: boolean;
  // 15. Ocupación o puesto de trabajo (si trabaja === true)
  puestoTrabajo?: string;

  // --- CONTACTO Y FAMILIA ---
  // 16. Estado civil ("SOLTERO" | "CASADO" | "CONVIVIENTE" | "DIVORCIADO" | "VIUDO")
  estadoCivil: 'SOLTERO' | 'CASADO' | 'CONVIVIENTE' | 'DIVORCIADO' | 'VIUDO';
  // 17. Teléfono móvil de contacto principal (9 dígitos)
  telefono: string;
  // 18. Correo electrónico personal
  correoElectronico?: string;
  // 19. Contacto familiar de emergencia (Nombre y Teléfono)
  contactoEmergencia: string;
  // 20. Grado de instrucción alcanzado
  gradoEstudios: string;
  // 21. Carga familiar (hijos o familiares a cargo)
  cargaFamiliar: boolean;
  // 22. Cantidad de personas dependientes a su cargo (0 si cargaFamiliar es false)
  cargaFamiliarPersonas: number;

  // --- ACCESO TECNOLÓGICO Y CONECTIVIDAD ---
  // 23. Dispone de servicio de Internet fijo en su domicilio
  internetCasa: boolean;
  // 24. Empresa operadora de telefonía móvil ("CLARO" | "MOVISTAR" | "ENTEL" | "BITEL" | "OTRO")
  operadorCelular: string;
  // 25. Equipos disponibles para el aprendizaje
  equipoDisponible: {
    pc: boolean;
    laptop: boolean;
    celular: boolean;
  };

  // --- INCLUSIÓN Y DIVERSIDAD CULTURAL ---
  // 26. Presenta alguna condición de discapacidad
  discapacidad: boolean;
  // 27. Tipo o detalle de discapacidad (si discapacidad === true)
  tipoDiscapacidad?: string;
  // 28. Lengua materna originaria aprendida en la infancia ("QUECHUA" | "AYMARA" | "CASTELLANO" | "OTRO")
  lenguaOriginaria: string;

  // --- CONTEXTO INSTITUCIONAL ASOCIADO ---
  institucional: InstitutionalContext2026;
}
```

---

## 3. ESPECIFICACIÓN DE CANALES DE TRANSMISIÓN HÍBRIDA

### 3.1. Canal WhatsApp Web (Mensaje Humano + Bloque Técnico Firmado CRC32)
Cuando el estudiante presiona el botón «Registrar por WhatsApp» en el formulario móvil, la aplicación genera un enlace universal `https://wa.me/<NUMERO_SECRETARIA>?text=<MENSAJE_ENCODED>`.

#### 3.1.1. Estructura del Mensaje
```
🎓 *CETPRO "MICAELA BASTIDAS" — FICHA DE MATRÍCULA 2026*
--------------------------------------------------
👤 *Estudiante:* MAMANI QUISPE, JUAN CARLOS
📄 *DNI:* 74518624
📚 *Programa:* PELUQUERÍA Y BARBERÍA
⏰ *Turno:* MAÑANA
📱 *Teléfono:* 951234567
🏠 *Domicilio:* Jr. Moquegua 450 - Juliaca
--------------------------------------------------
⚠️ *BLOQUE TÉCNICO DE IMPORTACIÓN AUTOMÁTICA:*
(Secretaría: copie todo este mensaje y péguelo en el sistema)

---INICIO-FICHA-CETPRO-2026---
v=1|dni=74518624|pat=MAMANI|mat=QUISPE|nom=JUAN CARLOS|sex=M|fn=2004-05-12|edad=22|pais=PERU|lug=PUNO/SAN ROMAN/JULIACA|dis=JULIACA|pro=SAN ROMAN|reg=PUNO|dom=JR. MOQUEGUA 450|tra=0|pto=|civ=SOLTERO|tel=951234567|cor=juan.mamani@gmail.com|eme=MARIA QUISPE 951987654|gra=SECUNDARIA COMPLETA|cfg=0|cfp=0|int=1|ope=CLARO|eqp=0,1,1|dis_c=0|dis_t=|len=QUECHUA|prg=PELUQUERÍA Y BARBERÍA|esp=Corte de Cabellos y Peinados|tur=MAÑANA|ins=INS-2026-0089|crc=5A2B9C1E
---FIN-FICHA-CETPRO-2026---
```

#### 3.1.2. Algoritmo de Integridad CRC32
Para evitar que caracteres alterados, saltos de línea automáticos de WhatsApp o emojis dañen la información:
1. Se toma la cadena concatenada de todos los pares clave=valor excluyendo el parámetro `crc=`.
2. Se calcula el CRC32 estándar (polinomio IEEE 802.3 `0xEDB88320`).
3. El checksum resultante se representa en 8 dígitos hexadecimales mayúsculas (`crc=5A2B9C1E`).
4. Al recibir el mensaje, el backend o frontend recalcula el CRC32. Si no coincide, se rechaza la importación automática indicando «Mensaje alterado o incompleto».

---

### 3.2. Canal QR Inverso (`CETPRO2026:v1:<crc32>:<base64url>`)
Si el estudiante se encuentra presencialmente en ventanilla de Secretaría:
1. El teléfono del estudiante genera y muestra en pantalla un código **QR de Alta Densidad (Versión 10 a 14, Corrección de Errores Nivel L o M)**.
2. Formato del Payload:
   ```
   CETPRO2026:v1:5A2B9C1E:eyJkbmkiOiI3NDUxODYyNCIsInBhdCI6Ik1BTUFOSSI...
   ```
3. Estructura:
   - `CETPRO2026`: Prefijo identificador de protocolo institucional.
   - `v1`: Versión del esquema.
   - `<crc32>`: Checksum hexadecimal de 8 caracteres del JSON comprimido.
   - `<base64url>`: Representación JSON de `StudentProfile2026` codificada en Base64 URL-safe (sin relleno `=`).
4. La Secretaría escanea el código con una webcam estándar o escáner 2D USB enfocado hacia la pantalla del móvil. El aplicativo decodifica el JSON en menos de 50 ms y rellena la ficha en el DOM al instante.

---

### 3.3. Canal LAN / Wi-Fi Directo (Red Local)
Cuando el servidor local en la PC de Secretaría dispone de conectividad de red con el teléfono:
- La Secretaría genera un código QR que apunta a:
  `http://<IP_LOCAL_SECRETARIA>:8085/ficha-2026`
- El estudiante abre el formulario en su navegador móvil, completa los datos y presiona «Enviar al CETPRO».
- La petición se envía mediante HTTP POST local directo al servidor de CEPRO_MICAELA 2.0.

---

## 4. CONTRATO DE ENDPOINTS HTTP (API LOCAL Y PÚBLICA ACOTADA)

### 4.1. `POST /api/public/ficha-registro-2026`
- **Ámbito:** Endpoint público local (sin autenticación requerida para permitir auto-registro desde celulares en la LAN).
- **Control de Seguridad:** Rate limiting estricto (máximo 5 peticiones por minuto por IP), validación de esquema y rechazo de payloads > 64 KB.
- **Payload:** Objeto `StudentProfile2026`.
- **Respuesta Exitosa (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "receiptCode": "INS-2026-0105",
    "receivedAt": "2026-11-11T10:15:30.000Z",
    "student": {
      "documentoIdentidad": "74518624",
      "fullName": "MAMANI QUISPE, JUAN CARLOS"
    },
    "message": "Ficha recibida satisfactoriamente. Acérquese a Secretaría para validar su inscripción."
  }
  ```

### 4.2. `POST /api/secretaria/fichas-registro/importar-texto`
- **Ámbito:** Endpoint autenticado para Secretaría (`SECRETARIA` o `DIRECTOR`).
- **Descripción:** Procesa el texto copiado desde WhatsApp Web o escaneado del QR Inverso.
- **Payload:**
  ```json
  {
    "rawText": "---INICIO-FICHA-CETPRO-2026---\nv=1|dni=74518624|...|crc=5A2B9C1E\n---FIN-FICHA-CETPRO-2026---"
  }
  ```
- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "crcValid": true,
    "profile": { /* StudentProfile2026 deserializado y normalizado */ },
    "warnings": []
  }
  ```

### 4.3. `POST /api/secretaria/fichas-registro/confirmar-guardar`
- **Ámbito:** Endpoint autenticado para Secretaría.
- **Descripción:** Persiste el estudiante en la base de datos `cetpro.sqlite` (entidad `students`) y asocia su contexto de matrícula.
- **Invariante:** Valida unicidad de DNI. Si ya existe, actualiza datos de contacto y domicilio preservando historial.
- **Respuesta Exitosa (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "studentId": "uuid-estudiante-2026",
    "documentoIdentidad": "74518624",
    "enrolled": true,
    "updatedAt": "2026-11-11T10:20:00.000Z"
  }
  ```

### 4.4. `GET /api/secretaria/fichas-registro/pdf/:documentoIdentidad`
- **Ámbito:** Endpoint autenticado para Secretaría y Dirección.
- **Descripción:** Genera en tiempo real el archivo PDF oficial de la **Ficha de Registro de Datos 2026** aplicando:
  1. Carga de la plantilla base `FICHA  REGIST.. DE DAT  2026  MICAELA.pdf`.
  2. Aplicación de los 3 parches blancos milimétricos (`whitePatches`) definidos en `FICHA_REGISTRO_2026_FIELDS.json`:
     - `programaEstudiosPatch` (x=166, y=562, w=135, h=13) para ocultar "PROGRAMAS DE ESTUDIO" preimpreso.
     - `paisPatch` (x=450, y=441, w=105, h=13) si país != "PERU".
     - `regionPatch` (x=465, y=409, w=90, h=13) si región != "PUNO".
  3. Sobreimpresión de texto con tipografía Helvetica-Bold / Helvetica a tamaños exactos (7.5 a 9 pt).
  4. Marcado de casillas X (`sexo`, `trabaja`, `cargaFamiliar`, `internetCasa`, `equipo`, `discapacidad`).
- **Respuesta:** Stream binario `application/pdf` con encabezado `Content-Disposition: inline; filename="FICHA_2026_74518624.pdf"`.

---

## 5. REGLAS DE CONVERSIÓN Y DESCOMPOSICIÓN GEOMÉTRICA

1. **Fecha de Nacimiento (Casilla Dividida en 3 Columnas):**
   - El PDF físico presenta 3 subdivisiones verticales: `[ DÍA ] | [ MES ] | [ AÑO ]`.
   - La fecha ISO `YYYY-MM-DD` se descompone programáticamente:
     - `fechaNacimientoDia`: `DD` centrado en `x=74.0, y=445.5`.
     - `fechaNacimientoMes`: `MM` centrado en `x=122.0, y=445.5`.
     - `fechaNacimientoAnio`: `YYYY` centrado en `x=160.0, y=445.5`.
2. **Casillas de Verificación Booleana (Marca X):**
   - Siempre se imprime la letra `'X'` mayúscula en negrita (`bold: true`, `fontSize: 9 pt`), centrada en las coordenadas de la opción correspondiente (`Si` o `No`, `F` o `M`).
3. **Equipos Disponibles (Múltiple Selección):**
   - Las casillas `equipoPC` (`x=375.0`), `equipoLaptop` (`x=452.0`) y `equipoCelular` (`x=535.0`) son independientes en la fila `y=234.3`. Se marca `'X'` en cada equipo que el estudiante declare poseer.
4. **Nombres y Apellidos Separados:**
   - La plantilla cuenta con casillas separadas para Apellido Paterno (`x=62.4`), Materno (`x=198.2`) y Nombres (`x=345.7`) en la fila `y=483.2`. Se prohíbe concatenar en un solo bloque.

---

## 6. CRITERIOS DE ACEPTACIÓN Y CERTIFICACIÓN TÉCNICA

| N° | Control | Criterio de Conformidad |
|---|---|---|
| **C01** | Geometría y Alineación | El texto generado se alinea perfectamente dentro de los bordes de la cuadrícula escaneada sin superposiciones ni colisiones con textos preimpresos. |
| **C02** | Parche de Programa | La leyenda preimpresa "PROGRAMAS DE ESTUDIO" queda 100% cubierta por el parche blanco y sobreimpresa con la carrera real del estudiante. |
| **C03** | Integridad CRC32 | El sistema rechaza cualquier bloque de WhatsApp cuyo CRC32 no coincida con el payload decodificado. |
| **C04** | QR Inverso | El código QR mostrado en pantalla móvil se decodifica en < 50 ms por la cámara web y puebla el 100% de los 27 campos. |
| **C05** | Preservación de BD | La importación no afecta ni resetea la relación 1:1 de estudiantes y matrículas activas del padrón 2026. |

---
*Fin del Contrato de Arquitectura Técnica CTR-FICHA-REGISTRO-2026-QR-WA-01.*