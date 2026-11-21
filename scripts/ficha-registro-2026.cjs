// scripts/ficha-registro-2026.cjs
// Ficha de Registro de Datos de Estudiantes 2026 - Captura Híbrida Digital y PDF Alta Fidelidad
// CEPRO_MICAELA 2.0 - CETPRO Micaela Bastidas Puyucawa (Puno / San Román)
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// --- 1. CONFIGURACIÓN GEOMÉTRICA Y CONSTANTES ---
const TEMPLATE_RELATIVE_PATH = 'sources/templates/PLANTILLAS_PDF_IMPRIMIR/PDF_INDIVIDUALES/FICHA  REGIST.. DE DAT  2026  MICAELA.pdf';
const FIELDS_JSON_RELATIVE_PATH = 'app/data/FICHA_REGISTRO_2026_FIELDS.json';

const DEFAULT_INSTITUTIONAL = {
  correoInstitucional: 'cetpromicaelabastidas@gmail.com',
  paginaWeb: 'www.cetpromicaelabastidas.edu.pe',
  nivelFormativo: 'AUXILIAR TÉCNICO',
  pais: 'PERU',
  region: 'PUNO',
  provincia: 'SAN ROMAN',
  distrito: 'JULIACA'
};

// --- 2. CHECKSUM CRC32 ESTÁNDAR (IEEE 802.3, Polinomio 0xEDB88320) ---
let crc32Table = null;
function getCrc32Table() {
  if (crc32Table) return crc32Table;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  crc32Table = table;
  return table;
}

function calculateCRC32(data) {
  const table = getCrc32Table();
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;
  return crc.toString(16).toUpperCase().padStart(8, '0');
}
// --- 3. GENERADOR DE CODIGO QR ISO/IEC 18004 EN JavaScript PURO ---

const QRMode = { NUMBER: 1, ALPHA_NUM: 2, BYTE: 4, KANJI: 8 };
const QRErrorCorrectionLevel = { L: 1, M: 0, Q: 3, H: 2 };
const QRMaskPattern = { PATTERN000: 0, PATTERN001: 1, PATTERN010: 2, PATTERN011: 3, PATTERN100: 4, PATTERN101: 5, PATTERN110: 6, PATTERN111: 7 };

const QRMath = {
  glog: n => { if (n < 1) throw Error('glog(' + n + ')'); return QRMath.LOG[n]; },
  gexp: n => { while (n < 0) n += 255; while (n >= 256) n -= 255; return QRMath.EXP[n]; },
  EXP: new Array(256),
  LOG: new Array(256)
};
for (let i = 0; i < 8; i++) QRMath.EXP[i] = 1 << i;
for (let i = 8; i < 256; i++) QRMath.EXP[i] = QRMath.EXP[i - 4] ^ QRMath.EXP[i - 5] ^ QRMath.EXP[i - 6] ^ QRMath.EXP[i - 8];
for (let i = 0; i < 255; i++) QRMath.LOG[QRMath.EXP[i]] = i;

function QRPolynomial(num, shift) {
  let offset = 0;
  while (offset < num.length && num[offset] === 0) offset++;
  this.num = new Array(num.length - offset + shift);
  for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
  for (let i = 0; i < shift; i++) this.num[num.length - offset + i] = 0;
}
QRPolynomial.prototype = {
  get: function(index) { return this.num[index]; },
  getLength: function() { return this.num.length; },
  multiply: function(e) {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      if (this.get(i) === 0) continue;
      for (let j = 0; j < e.getLength(); j++) {
        if (e.get(j) === 0) continue;
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  },
  mod: function(e) {
    if (this.getLength() - e.getLength() < 0) return this;
    if (this.get(0) === 0) return new QRPolynomial(this.num.slice(1), 0).mod(e);
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      if (e.get(i) === 0) continue;
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
};

const QRRSBlock = {
  RS_BLOCK_TABLE: [
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
    [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
    [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
    [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]
  ],
  getRSBlocks: function(typeNumber, errorCorrectionLevel) {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
    if (!rsBlock) throw new Error('bad rs block @ typeNumber:' + typeNumber);
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) list.push({ totalCount, dataCount });
    }
    return list;
  },
  getRsBlockTable: function(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return undefined;
    }
  }
};

const QRUtil = {
  PATTERN_POSITION_TABLE: [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
    [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82],
    [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
  ],
  G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
  G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
  G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
  getBCHTypeInfo: function(data) {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
    }
    return ((data << 10) | d) ^ QRUtil.G15_MASK;
  },
  getBCHTypeNumber: function(data) {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
    }
    return (data << 12) | d;
  },
  getBCHDigit: function(data) {
    let digit = 0;
    while (data !== 0) { digit++; data >>>= 1; }
    return digit;
  },
  getPatternPosition: function(typeNumber) {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
  },
  getMask: function(maskPattern, i, j) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001: return i % 2 === 0;
      case QRMaskPattern.PATTERN010: return j % 3 === 0;
      case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101: return ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111: return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default: throw new Error('bad maskPattern:' + maskPattern);
    }
  },
  getErrorFactoryPolynomial: function(errorCorrectionLength) {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectionLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  },
  getLengthInBits: function(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.NUMBER: return 10;
        case QRMode.ALPHA_NUM: return 9;
        case QRMode.BYTE: return 8;
        case QRMode.KANJI: return 8;
        default: throw new Error('mode:' + mode);
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.NUMBER: return 12;
        case QRMode.ALPHA_NUM: return 11;
        case QRMode.BYTE: return 16;
        case QRMode.KANJI: return 10;
        default: throw new Error('mode:' + mode);
      }
    } else if (type <= 40) {
      switch (mode) {
        case QRMode.NUMBER: return 14;
        case QRMode.ALPHA_NUM: return 13;
        case QRMode.BYTE: return 16;
        case QRMode.KANJI: return 12;
        default: throw new Error('mode:' + mode);
      }
    } else {
      throw new Error('type:' + type);
    }
  },
  getLostPoint: function(qrCode) {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
          }
        }
        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
      }
    }
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) lostPoint += 3;
      }
    }
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) darkCount++;
      }
    }
    const ratio = Math.abs((100 * darkCount) / (moduleCount * moduleCount) - 50) / 5;
    lostPoint += ratio * 10;
    return lostPoint;
  }
};

function QR8bitByte(data) {
  this.mode = QRMode.BYTE;
  this.data = data;
  this.bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(this.data) : Buffer.from(this.data, 'utf8');
}
QR8bitByte.prototype = {
  getLength: function() { return this.bytes.length; },
  write: function(buffer) {
    for (let i = 0; i < this.bytes.length; i++) buffer.put(this.bytes[i], 8);
  }
};

function QRBitBuffer() {
  this.buffer = [];
  this.length = 0;
}
QRBitBuffer.prototype = {
  get: function(index) {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  },
  put: function(num, length) {
    for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
  },
  getLengthInBits: function() { return this.length; },
  putBit: function(bit) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) this.buffer.push(0);
    if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    this.length++;
  }
};

function QRCodeModel(typeNumber, errorCorrectionLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectionLevel = errorCorrectionLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = [];
}
QRCodeModel.prototype = {
  addData: function(data) {
    const newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = null;
  },
  isDark: function(row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) throw new Error(row + ',' + col);
    return this.modules[row][col];
  },
  getModuleCount: function() { return this.moduleCount; },
  make: function() {
    this.makeImpl(false, this.getBestMaskPattern());
  },
  makeImpl: function(test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount).fill(null);
    }
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) this.setupTypeNumber(test);
    if (this.dataCache === null) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
    this.mapData(this.dataCache, maskPattern);
  },
  setupPositionProbePattern: function(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  },
  getBestMaskPattern: function() {
    let minLostPoint = 0, bestMaskPattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        bestMaskPattern = i;
      }
    }
    return bestMaskPattern;
  },
  setupTimingPattern: function() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = (r % 2 === 0);
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = (c % 2 === 0);
    }
  },
  setupPositionAdjustPattern: function() {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i], col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            this.modules[row + r][col + c] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
          }
        }
      }
    }
  },
  setupTypeNumber: function(test) {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  },
  setupTypeInfo: function(test, maskPattern) {
    const data = (this.errorCorrectionLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;

      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = !test;
  },
  mapData: function(data, maskPattern) {
    let inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
            const mask = QRUtil.getMask(maskPattern, row, col - c);
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { bitIndex = 7; byteIndex++; }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
};

QRCodeModel.createData = function(typeNumber, errorCorrectionLevel, dataList) {
  const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
  const buffer = new QRBitBuffer();
  for (let i = 0; i < dataList.length; i++) {
    const data = dataList[i];
    buffer.put(data.mode, 4);
    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
    data.write(buffer);
  }
  let totalDataCount = 0;
  for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error('code length overflow (' + buffer.getLengthInBits() + '>' + totalDataCount * 8 + ')');
  }
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
  while (true) {
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(0xEC, 8);
    if (buffer.getLengthInBits() >= totalDataCount * 8) break;
    buffer.put(0x11, 8);
  }
  return QRCodeModel.createBytes(buffer, rsBlocks);
};

QRCodeModel.createBytes = function(buffer, rsBlocks) {
  let offset = 0, maxDcCount = 0, maxEcCount = 0;
  const dcdata = new Array(rsBlocks.length), ecdata = new Array(rsBlocks.length);
  for (let r = 0; r < rsBlocks.length; r++) {
    const dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);
    dcdata[r] = new Array(dcCount);
    for (let i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xFF & buffer.buffer[i + offset];
    offset += dcCount;
    const rsPoly = QRUtil.getErrorFactoryPolynomial(ecCount);
    const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
    const modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (let i = 0; i < ecdata[r].length; i++) {
      const modIndex = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
    }
  }
  let totalCodeCount = 0;
  for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
  const data = new Array(totalCodeCount);
  let index = 0;
  for (let i = 0; i < maxDcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    }
  }
  for (let i = 0; i < maxEcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    }
  }
  return data;
};

function generateQrSvg(text, options = {}) {
  const margin = options.margin !== undefined ? options.margin : 4;
  const cellSize = options.cellSize || 6;
  const color = options.color || '#000000';
  const bgColor = options.bgColor || '#ffffff';
  const ecc = options.ecc !== undefined ? options.ecc : QRErrorCorrectionLevel.M;
  let qr = null;
  for (let type = 1; type <= 40; type++) {
    try {
      qr = new QRCodeModel(type, ecc);
      qr.addData(text);
      qr.make();
      break;
    } catch (e) {
      if (type === 40) throw e;
    }
  }
  const count = qr.getModuleCount();
  const size = (count + margin * 2) * cellSize;
  let pathStr = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        pathStr += 'M' + x + ',' + y + 'h' + cellSize + 'v' + cellSize + 'h-' + cellSize + 'z ';
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" style="width:100%;height:100%;max-width:220px;max-height:220px;display:block;border-radius:8px;"><rect width="100%" height="100%" fill="' + bgColor + '"/><path d="' + pathStr.trim() + '" fill="' + color + '"/></svg>';
}

// --- 4. NORMALIZACIÓN Y ENRIQUECIMIENTO DE StudentProfile2026 ---
function normalizeProfile2026(rawInput, core, student, enrollment) {
  let raw = rawInput;
  if (typeof raw === 'string') {
    try { raw = decodeCompactPayload(raw); } catch { raw = {}; }
  }
  raw = raw || {};
  if (raw.profile && typeof raw.profile === 'object') {
    raw = { ...raw, ...raw.profile };
  }
  if (!student && core && (raw.documentoIdentidad || raw.dni || raw.document)) {
    const docNum = String(raw.documentoIdentidad || raw.dni || raw.document).trim();
    student = core.records('students').find(s => s.document === docNum);
  }
  if (typeof student === 'string' && core) student = core.record('students', student);
  if (typeof enrollment === 'string' && core) enrollment = core.record('enrollments', enrollment);
  if (!enrollment && student && core) {
    enrollment = core.records('enrollments').find(e => e.studentId === student.id && e.active);
  }
  if (enrollment && !student && core) student = core.record('students', enrollment.studentId);

  let stProfile = {};
  if (student) {
    if (student.profile2026) stProfile = { ...student.profile2026 };
    else if (core) {
      const docSt = core.record('documentSettings', 'profile2026:' + student.id);
      if (docSt?.fields) stProfile = { ...docSt.fields };
    }
  }

  let group = null, program = null, moduleRec = null;
  if (enrollment && core) {
    group = core.record('groups', enrollment.groupId);
    if (group) {
      program = core.record('programs', group.programId);
      moduleRec = core.record('modules', group.moduleId);
    }
  }

  const rawInst = (raw.institucional && typeof raw.institucional === 'object') ? raw.institucional : {};
  const rawEqp = (raw.equipoDisponible && typeof raw.equipoDisponible === 'object') ? raw.equipoDisponible : null;
  const stInst = (stProfile.institucional && typeof stProfile.institucional === 'object') ? stProfile.institucional : {};
  const stEqp = (stProfile.equipoDisponible && typeof stProfile.equipoDisponible === 'object') ? stProfile.equipoDisponible : null;

  const merged = { ...DEFAULT_INSTITUTIONAL, ...stProfile, ...raw };
  const documentoIdentidad = String(raw.documentoIdentidad || raw.dni || raw.document || stProfile.documentoIdentidad || student?.document || '').trim();
  let apellidoPaterno = String(raw.apellidoPaterno || raw.pat || stProfile.apellidoPaterno || student?.lastName1 || '').trim().toUpperCase();
  let apellidoMaterno = String(raw.apellidoMaterno || raw.mat || stProfile.apellidoMaterno || student?.lastName2 || '').trim().toUpperCase();
  let nombres = String(raw.nombres || raw.nom || stProfile.nombres || student?.firstNames || '').trim().toUpperCase();

  if ((!apellidoPaterno || !nombres) && student?.name) {
    const parts = student.name.split(',');
    if (parts.length >= 2) {
      const apellidos = parts[0].trim().split(' ');
      if (!apellidoPaterno) apellidoPaterno = (apellidos[0] || '').toUpperCase();
      if (!apellidoMaterno && apellidos.length > 1) apellidoMaterno = apellidos.slice(1).join(' ').toUpperCase();
      if (!nombres) nombres = parts[1].trim().toUpperCase();
    }
  }

  let sexo = 'F';
  const sRaw = String(raw.sexo || raw.sex || stProfile.sexo || student?.sex || '').trim().toUpperCase();
  if (student && !raw.sexo && !raw.sex && !stProfile.sexo && student.sex) {
    sexo = student.sex === 'M' ? 'F' : 'M';
  } else if (sRaw === 'F' || sRaw === 'FEMENINO' || sRaw === 'MUJER') {
    sexo = 'F';
  } else if (sRaw === 'M' || sRaw === 'H' || sRaw === 'MASCULINO' || sRaw === 'HOMBRE') {
    sexo = 'M';
  }

  let fechaNacimiento = String(raw.fechaNacimiento || raw.fn || stProfile.fechaNacimiento || student?.birthDate || '2004-01-01').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNacimiento)) {
    const [d, m, y] = fechaNacimiento.split('/');
    fechaNacimiento = y + '-' + m + '-' + d;
  }
  const fnParts = fechaNacimiento.split('-');
  const fechaNacimientoAnio = fnParts[0] || '2004';
  const fechaNacimientoMes = fnParts[1] ? fnParts[1].padStart(2, '0') : '01';
  const fechaNacimientoDia = fnParts[2] ? fnParts[2].padStart(2, '0') : '01';

  let edad = Number(raw.edad ?? raw.ed ?? stProfile.edad);
  if (!edad || isNaN(edad)) {
    const y = Number(fechaNacimientoAnio), m = Number(fechaNacimientoMes) - 1, d = Number(fechaNacimientoDia);
    const birth = new Date(Date.UTC(y, m, d)), today = new Date();
    let diff = today.getUTCFullYear() - birth.getUTCFullYear();
    const dm = today.getUTCMonth() - birth.getUTCMonth();
    if (dm < 0 || (dm === 0 && today.getUTCDate() < birth.getUTCDate())) diff--;
    edad = Math.max(14, diff || 18);
  }

  const pais = String(raw.pais || raw.pa || stProfile.pais || DEFAULT_INSTITUTIONAL.pais).trim().toUpperCase();
  const region = String(raw.region || raw.reg || stProfile.region || DEFAULT_INSTITUTIONAL.region).trim().toUpperCase();
  const provincia = String(raw.provincia || raw.pro || stProfile.provincia || DEFAULT_INSTITUTIONAL.provincia).trim().toUpperCase();
  const distrito = String(raw.distrito || raw.dis || stProfile.distrito || DEFAULT_INSTITUTIONAL.distrito).trim().toUpperCase();
  const lugarNacimiento = String(raw.lugarNacimiento || raw.lug || stProfile.lugarNacimiento || (region + ' / ' + provincia + ' / ' + distrito)).trim().toUpperCase();
  const domicilio = String(raw.domicilio ?? raw.dom ?? stProfile.domicilio ?? '').trim().toUpperCase();

  const rawTrabaja = raw.trabaja !== undefined ? raw.trabaja : (raw.tra !== undefined ? raw.tra : stProfile.trabaja);
  const trabaja = Boolean(rawTrabaja === true || rawTrabaja === 1 || rawTrabaja === 'true' || rawTrabaja === '1');
  const puestoTrabajo = trabaja ? String(raw.puestoTrabajo ?? raw.pto ?? stProfile.puestoTrabajo ?? '').trim().toUpperCase() : '';
  const estadoCivil = String(raw.estadoCivil || raw.civ || stProfile.estadoCivil || 'SOLTERO').trim().toUpperCase();
  const telefono = String(raw.telefono ?? raw.tel ?? stProfile.telefono ?? '').trim();
  const correoElectronico = String(raw.correoElectronico ?? raw.cor ?? stProfile.correoElectronico ?? '').trim().toLowerCase();
  const contactoEmergencia = String(raw.contactoEmergencia ?? raw.eme ?? stProfile.contactoEmergencia ?? '').trim().toUpperCase();
  const gradoEstudios = String(raw.gradoEstudios || raw.gra || stProfile.gradoEstudios || 'SECUNDARIA COMPLETA').trim().toUpperCase();

  const rawCarga = raw.cargaFamiliar !== undefined ? raw.cargaFamiliar : (raw.cfg !== undefined ? raw.cfg : stProfile.cargaFamiliar);
  const cargaFamiliar = Boolean(rawCarga === true || rawCarga === 1 || rawCarga === 'true' || rawCarga === '1');
  const cargaFamiliarPersonas = cargaFamiliar ? (Number(raw.cargaFamiliarPersonas ?? raw.cfp ?? stProfile.cargaFamiliarPersonas) || 1) : 0;

  const rawNet = raw.internetCasa !== undefined ? raw.internetCasa : (raw.net !== undefined ? raw.net : (raw.int !== undefined ? raw.int : stProfile.internetCasa));
  const internetCasa = Boolean(rawNet === true || rawNet === 1 || rawNet === 'true' || rawNet === '1');
  const operadorCelular = String(raw.operadorCelular || raw.ope || stProfile.operadorCelular || 'CLARO').trim().toUpperCase();

  const eqpParts = typeof merged.eqp === 'string' ? merged.eqp.split(',') : [];
  const equipoPC = Boolean(rawEqp ? rawEqp.pc : (raw.equipoPC ?? raw.pc ?? (eqpParts[0] !== undefined ? eqpParts[0] === '1' : (stEqp?.pc ?? stProfile.equipoPC ?? false))));
  const equipoLaptop = Boolean(rawEqp ? rawEqp.laptop : (raw.equipoLaptop ?? raw.lap ?? (eqpParts[1] !== undefined ? eqpParts[1] === '1' : (stEqp?.laptop ?? stProfile.equipoLaptop ?? false))));
  const equipoCelular = Boolean(rawEqp ? rawEqp.celular : (raw.equipoCelular ?? raw.cel ?? (eqpParts[2] !== undefined ? eqpParts[2] === '1' : (stEqp?.celular ?? stProfile.equipoCelular ?? true))));

  const rawDisc = raw.discapacidad !== undefined ? raw.discapacidad : (raw.dsc !== undefined ? raw.dsc : (raw.dis_c !== undefined ? raw.dis_c : stProfile.discapacidad));
  const discapacidad = Boolean(rawDisc === true || rawDisc === 1 || rawDisc === 'true' || rawDisc === '1');
  const tipoDiscapacidad = discapacidad ? String(raw.tipoDiscapacidad ?? raw.dst ?? raw.dis_t ?? stProfile.tipoDiscapacidad ?? '').trim().toUpperCase() : '';
  const lenguaOriginaria = String(raw.lenguaOriginaria || raw.len || stProfile.lenguaOriginaria || 'CASTELLANO').trim().toUpperCase();

  const programaEstudios = String(rawInst.programaEstudios || raw.programaEstudios || raw.prg || stInst.programaEstudios || stProfile.programaEstudios || program?.name || 'COMPUTACIÓN E INFORMÁTICA').trim().toUpperCase();
  const especialidad = String(rawInst.especialidad || raw.especialidad || raw.esp || stInst.especialidad || stProfile.especialidad || moduleRec?.name || programaEstudios).trim().toUpperCase();
  const turno = String(rawInst.turno || raw.turno || raw.tur || stInst.turno || stProfile.turno || group?.turno || 'MAÑANA').trim().toUpperCase();
  const codigoInscripcion = String(rawInst.codigoInscripcion || raw.codigoInscripcion || raw.ins || stInst.codigoInscripcion || stProfile.codigoInscripcion || enrollment?.code || (documentoIdentidad ? ('INS-2026-' + documentoIdentidad.slice(-4)) : 'INS-2026-0001')).trim();
  const correoInstitucional = String(rawInst.correoInstitucional || raw.correoInstitucional || stInst.correoInstitucional || DEFAULT_INSTITUTIONAL.correoInstitucional).trim();
  const paginaWeb = String(rawInst.paginaWeb || raw.paginaWeb || stInst.paginaWeb || DEFAULT_INSTITUTIONAL.paginaWeb).trim();
  const nivelFormativo = String(rawInst.nivelFormativo || raw.nivelFormativo || stInst.nivelFormativo || DEFAULT_INSTITUTIONAL.nivelFormativo).trim().toUpperCase();

  return {
    documentoIdentidad,
    apellidoPaterno,
    apellidoMaterno,
    nombres,
    sexo,
    fechaNacimiento,
    fechaNacimientoDia,
    fechaNacimientoMes,
    fechaNacimientoAnio,
    edad,
    pais,
    region,
    provincia,
    distrito,
    lugarNacimiento,
    domicilio,
    trabaja,
    puestoTrabajo,
    estadoCivil,
    telefono,
    correoElectronico,
    contactoEmergencia,
    gradoEstudios,
    cargaFamiliar,
    cargaFamiliarPersonas,
    internetCasa,
    operadorCelular,
    equipoPC,
    equipoLaptop,
    equipoCelular,
    discapacidad,
    tipoDiscapacidad,
    lenguaOriginaria,
    programaEstudios,
    especialidad,
    turno,
    codigoInscripcion,
    correoInstitucional,
    paginaWeb,
    nivelFormativo,
    equipoDisponible: { pc: equipoPC, laptop: equipoLaptop, celular: equipoCelular },
    institucional: { codigoInscripcion, correoInstitucional, paginaWeb, programaEstudios, nivelFormativo, especialidad, turno }
  };
}

// --- 5. CODIFICADOR Y DECODIFICADOR WHATSAPP / QR REVERSO ---
function encodeCompactPayload(profile) {
  const p = normalizeProfile2026(profile);
  const compact = {
    v: 1,
    dni: p.documentoIdentidad,
    pat: p.apellidoPaterno,
    mat: p.apellidoMaterno,
    nom: p.nombres,
    sex: p.sexo,
    fn: p.fechaNacimiento,
    ed: p.edad,
    pa: p.pais,
    lug: p.lugarNacimiento,
    dis: p.distrito,
    pro: p.provincia,
    reg: p.region,
    dom: p.domicilio,
    tra: p.trabaja ? 1 : 0,
    pto: p.puestoTrabajo || '',
    civ: p.estadoCivil,
    tel: p.telefono,
    cor: p.correoElectronico || '',
    eme: p.contactoEmergencia,
    gra: p.gradoEstudios,
    cfg: p.cargaFamiliar ? 1 : 0,
    cfp: p.cargaFamiliarPersonas || 0,
    net: p.internetCasa ? 1 : 0,
    ope: p.operadorCelular,
    pc: p.equipoPC ? 1 : 0,
    lap: p.equipoLaptop ? 1 : 0,
    cel: p.equipoCelular ? 1 : 0,
    dsc: p.discapacidad ? 1 : 0,
    dst: p.tipoDiscapacidad || '',
    len: p.lenguaOriginaria,
    prg: p.programaEstudios,
    esp: p.especialidad || '',
    tur: p.turno,
    ins: p.codigoInscripcion || ''
  };
  const jsonBuf = Buffer.from(JSON.stringify(compact), 'utf8');
  const crc = calculateCRC32(jsonBuf);
  const b64 = jsonBuf.toString('base64url');
  return 'CETPRO2026:v1:' + crc + ':' + b64;
}

function decodeCompactPayload(tokenOrRawText) {
  if (!tokenOrRawText) {
    const err = new Error('No se proporcionó ningún texto o código de ficha.');
    err.status = 400; throw err;
  }
  if (typeof tokenOrRawText === 'object' && (tokenOrRawText.documentoIdentidad || tokenOrRawText.dni)) {
    return normalizeProfile2026(tokenOrRawText);
  }
  const str = String(tokenOrRawText).trim();

  // 1. Caso Token CETPRO2026:v1:<CRC32>:<BASE64URL>
  if (str.includes('CETPRO2026:v1:')) {
    const match = str.match(/CETPRO2026:v1:([^:\s]+):([^:\s\r\n]+)/);
    if (!match) {
      const err = new Error('El código de la ficha está incompleto o fue modificado (CRC inválido).');
      err.status = 400; throw err;
    }
    const providedCrc = match[1].toUpperCase();
    const b64 = match[2];
    const buf = Buffer.from(b64, 'base64url');
    const actualCrc = calculateCRC32(buf);
    if (actualCrc !== providedCrc) {
      const err = new Error('El código de la ficha está incompleto o fue modificado (CRC inválido).');
      err.status = 400; throw err;
    }
    let parsed = {};
    try { parsed = JSON.parse(buf.toString('utf8')); } catch {
      const err = new Error('El contenido de la ficha está corrupto.');
      err.status = 400; throw err;
    }
    return normalizeProfile2026(parsed);
  }

  // 2. Caso Bloque Pipe v=1|dni=...|crc=<CRC32>
  if (str.includes('|crc=')) {
    const startTag = '---INICIO-FICHA-CETPRO-2026---';
    const endTag = '---FIN-FICHA-CETPRO-2026---';
    let inner = str;
    if (inner.includes(startTag) && inner.includes(endTag)) {
      inner = inner.slice(inner.indexOf(startTag) + startTag.length, inner.indexOf(endTag)).trim();
    }
    const crcIdx = inner.lastIndexOf('|crc=');
    const payload = inner.slice(0, crcIdx).trim();
    const providedCrc = inner.slice(crcIdx + 5, crcIdx + 13).toUpperCase();
    const actualCrc = calculateCRC32(Buffer.from(payload, 'utf8'));
    if (actualCrc !== providedCrc) {
      const err = new Error('El código de la ficha está incompleto o fue modificado (CRC inválido).');
      err.status = 400; throw err;
    }
    const parts = payload.split('|');
    const dict = {};
    for (const p of parts) {
      const [k, ...v] = p.split('=');
      if (k) dict[k.trim()] = v.join('=').trim();
    }
    return normalizeProfile2026(dict);
  }

  // 3. Caso JSON directo
  try {
    const obj = JSON.parse(str);
    if (obj.documentoIdentidad || obj.dni || obj.nombres || obj.nom) {
      return normalizeProfile2026(obj);
    }
  } catch {}

  const err = new Error('El código de la ficha está incompleto o fue modificado (CRC inválido).');
  err.status = 400; throw err;
}

function generateWhatsAppMessage(profile, targetPhoneNumber) {
  const p = normalizeProfile2026(profile);
  const token = encodeCompactPayload(p);
  const text = [
    '🎓 *CETPRO "MICAELA BASTIDAS" — FICHA DE MATRÍCULA 2026*',
    '--------------------------------------------------',
    '👤 *Estudiante:* ' + p.apellidoPaterno + ' ' + p.apellidoMaterno + ', ' + p.nombres,
    '📄 *DNI:* ' + p.documentoIdentidad,
    '📚 *Programa:* ' + p.programaEstudios,
    '⏰ *Turno:* ' + p.turno,
    '📱 *Teléfono:* ' + p.telefono,
    '🏠 *Domicilio:* ' + p.domicilio,
    '--------------------------------------------------',
    '⚠️ *BLOQUE TÉCNICO DE IMPORTACIÓN AUTOMÁTICA:*',
    '(Secretaría: copie todo este mensaje y péguelo en el sistema)',
    '',
    '---INICIO-FICHA-CETPRO-2026---',
    token,
    '---FIN-FICHA-CETPRO-2026---'
  ].join('\n');

  let url = 'https://wa.me/?text=' + encodeURIComponent(text);
  if (targetPhoneNumber) {
    let phone = String(targetPhoneNumber).replace(/\D/g, '');
    if (phone.length === 9) phone = '51' + phone;
    if (phone.length >= 10) {
      url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
    }
  }
  return { message: text, url, token, profile: p };
}

// --- 6. MOTOR DE RENDERIZADO PDF DE ALTA FIDELIDAD ---
async function renderFichaRegistro2026PDF(root, profileInput, core) {
  const profile = normalizeProfile2026(profileInput, core);
  const baseDir = root || path.resolve(__dirname, '..');
  const templatePath = path.resolve(baseDir, TEMPLATE_RELATIVE_PATH);
  const fieldsPath = path.resolve(baseDir, FIELDS_JSON_RELATIVE_PATH);

  if (!fs.existsSync(templatePath)) {
    throw new Error('Plantilla oficial de ficha no encontrada en: ' + templatePath);
  }

  let fieldsConfig = {};
  if (fs.existsSync(fieldsPath)) {
    try {
      const rawJson = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));
      fieldsConfig = rawJson.fields || {};
    } catch {}
  }

  const templateBytes = fs.readFileSync(templatePath);
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);

  let font, boldFont;
  const winArial = path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'arial.ttf');
  const winArialBd = path.join(process.env.WINDIR || 'C:/Windows', 'Fonts', 'arialbd.ttf');
  if (fs.existsSync(winArial) && fs.existsSync(winArialBd)) {
    try {
      font = await doc.embedFont(fs.readFileSync(winArial), { subset: true });
      boldFont = await doc.embedFont(fs.readFileSync(winArialBd), { subset: true });
    } catch {
      font = await doc.embedFont(StandardFonts.Helvetica);
      boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    }
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  const page = doc.getPages()[0];

  // 1. LIMPIEZA TOTAL DE CELDAS PREIMPRESAS DEL ALUMNO EN LA PLANTILLA (whitePatches)
  // Parche 1: Limpia "PROGRAMAS DE ESTUDIO" (x=166, y=562, w=136, h=13)
  page.drawRectangle({ x: 166, y: 562, width: 136, height: 13, color: rgb(1, 1, 1) });
  // Parche 2: Limpia "PERU" preimpreso en País (x=450, y=441, w=105, h=13) para estampar en Bold limpio
  page.drawRectangle({ x: 450, y: 441, width: 105, height: 13, color: rgb(1, 1, 1) });
  // Parche 3: Limpia "PUNO" preimpreso en Región (x=465, y=409, w=90, h=13) para estampar en Bold limpio
  page.drawRectangle({ x: 465, y: 409, width: 90, height: 13, color: rgb(1, 1, 1) });
  // Parche 4: Limpia "CASTELLANO," preimpreso en Lengua Originaria (x=344, y=189, w=220, h=13)
  page.drawRectangle({ x: 344, y: 189, width: 220, height: 13, color: rgb(1, 1, 1) });

  // Helper para estampar texto en GROSOR BOLD por defecto con auto-fit
  function drawText(key, textValue, overrideBold = true, customX = null, customMaxW = null) {
    const f = fieldsConfig[key];
    if (!f || textValue === undefined || textValue === null || textValue === '') return;
    const str = String(textValue).trim();
    if (!str) return;

    const useBold = overrideBold !== null ? overrideBold : true;
    const activeFont = useBold ? boldFont : font;
    let size = (f.fontSize || 8.5);
    const maxW = customMaxW || f.maxWidth || 120;

    let textW = activeFont.widthOfTextAtSize(str, size);
    if (textW > maxW) {
      const scale = maxW / textW;
      size = Math.max(4.2, size * scale);
      textW = activeFont.widthOfTextAtSize(str, size);
    }

    let drawX = customX !== null ? customX : f.x;
    if (f.align === 'center' && customX === null) {
      drawX = f.x + (maxW - textW) / 2;
    }

    page.drawText(str, {
      x: drawX,
      y: f.y,
      size,
      font: activeFont,
      color: rgb(0, 0, 0)
    });
  }

  // Helper para estampar marcas 'X' en BOLD destacado
  function drawMark(key, condition) {
    if (!condition) return;
    const f = fieldsConfig[key];
    if (!f) return;
    page.drawText(f.mark || 'X', {
      x: f.x,
      y: f.y,
      size: Math.max(9.5, f.fontSize || 9.5),
      font: boldFont,
      color: rgb(0, 0, 0)
    });
  }

  // Estampado de campos institucionales y de carrera en BOLD
  drawText('codigoInscripcion', profile.codigoInscripcion, true);
  drawText('correoInstitucional', profile.correoInstitucional, true);
  drawText('paginaWeb', profile.paginaWeb, true);
  drawText('programaEstudios', profile.programaEstudios, true);
  drawText('nivelFormativo', profile.nivelFormativo, true);
  drawText('especialidad', profile.especialidad, true);
  drawText('turno', profile.turno, true);

  // Estampado de los 27 datos del estudiante en BOLD
  drawText('apellidoPaterno', profile.apellidoPaterno, true);
  drawText('apellidoMaterno', profile.apellidoMaterno, true);
  drawText('nombres', profile.nombres, true);

  drawMark('sexoF', profile.sexo === 'F');
  drawMark('sexoM', profile.sexo === 'M');

  drawText('fechaNacimientoDia', profile.fechaNacimientoDia, true);
  drawText('fechaNacimientoMes', profile.fechaNacimientoMes, true);
  drawText('fechaNacimientoAnio', profile.fechaNacimientoAnio, true);
  drawText('documentoIdentidad', profile.documentoIdentidad, true);
  drawText('edad', String(profile.edad), true);

  drawText('pais', profile.pais || 'PERU', true);
  drawText('lugarNacimiento', profile.lugarNacimiento, true);
  drawText('distrito', profile.distrito, true);
  drawText('provincia', profile.provincia, true);
  drawText('region', profile.region || 'PUNO', true);
  drawText('domicilio', profile.domicilio, true);

  drawMark('trabajaSi', profile.trabaja === true);
  drawMark('trabajaNo', profile.trabaja === false);
  if (profile.trabaja && profile.puestoTrabajo) {
    drawText('puestoTrabajo', profile.puestoTrabajo, true);
  }

  drawText('estadoCivil', profile.estadoCivil, true);
  drawText('telefono', profile.telefono, true);
  drawText('correoElectronico', profile.correoElectronico, true);
  drawText('contactoEmergencia', profile.contactoEmergencia, true);
  drawText('gradoEstudios', profile.gradoEstudios, true);

  drawMark('cargaFamiliarSi', profile.cargaFamiliar === true);
  drawMark('cargaFamiliarNo', profile.cargaFamiliar === false);
  if (profile.cargaFamiliar && profile.cargaFamiliarPersonas > 0) {
    drawText('cargaFamiliarPersonas', String(profile.cargaFamiliarPersonas), true);
  }

  drawMark('internetCasaSi', profile.internetCasa === true);
  drawMark('internetCasaNo', profile.internetCasa === false);
  drawText('operadorCelular', profile.operadorCelular, true);

  drawMark('equipoPC', profile.equipoPC === true);
  drawMark('equipoLaptop', profile.equipoLaptop === true);
  drawMark('equipoCelular', profile.equipoCelular === true);

  drawMark('discapacidadSi', profile.discapacidad === true);
  drawMark('discapacidadNo', profile.discapacidad === false);
  if (profile.discapacidad && profile.tipoDiscapacidad) {
    drawText('tipoDiscapacidad', profile.tipoDiscapacidad, true);
  }

  const rawLen = String(profile.lenguaOriginaria || 'CASTELLANO').trim().toUpperCase();
  const formattedLen = (rawLen === 'CASTELLANO' || rawLen === 'NINGUNA (SOLO CASTELLANO)' || rawLen === 'NINGUNA' || rawLen.includes('CASTELLANO'))
    ? (rawLen.includes('NINGUNA') ? 'CASTELLANO' : rawLen)
    : ('CASTELLANO, ' + rawLen);
  drawText('lenguaOriginaria', formattedLen, true, 345.7, 214);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// --- 7. GENERADOR DE FORMULARIO WEB AUTÓNOMO DESCARGABLE (MOBILE-FIRST) ---
function normalizePeruWhatsapp(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits || digits === '51951234567' || digits === '951234567') return '';
  if (digits.length === 9 && digits.startsWith('9')) return '51' + digits;
  if (digits.length === 11 && digits.startsWith('519')) return digits;
  return digits.length >= 9 ? digits : '';
}

function generateStandaloneAdmissionHtml(config = {}) {
  const cleanPhone = normalizePeruWhatsapp(config.secretariaWhatsapp || config.whatsappPhone || '');
  const displayPhone9 = cleanPhone.startsWith('51') && cleanPhone.length === 11 ? cleanPhone.slice(2) : cleanPhone;
  const receptorNombre = config.receptorNombre || 'Secretaría Académica';
  const instName = config.institucion || 'CETPRO "MICAELA BASTIDAS PUYUCAWA"';
  // Embed the same local photo in LAN and downloaded forms so neither needs network access.
  const photoPaths = [
    path.join(__dirname, '..', 'dist', 'images', 'modules', 'inscripcion.webp'),
    path.join(__dirname, '..', 'public', 'images', 'modules', 'inscripcion.webp'),
  ];
  let photoMarkup = '';
  for (const photoPath of photoPaths) {
    try {
      const photo = fs.readFileSync(photoPath);
      photoMarkup = '<img class="admission-photo" alt="" width="960" height="540" src="data:image/webp;base64,' + photo.toString('base64') + '">';
      break;
    } catch { /* Keep the solid banner if the optional photo is missing. */ }
  }
  let embeddedQrJs = '';
  try {
    const selfSrc = fs.readFileSync(__filename, 'utf8');
    const sIdx = selfSrc.indexOf('// --- 3. GENERADOR DE CODIGO QR');
    const eIdx = selfSrc.indexOf('// --- 4. NORMALIZACIÓN');
    if (sIdx !== -1 && eIdx > sIdx) embeddedQrJs = selfSrc.slice(sIdx, eIdx);
  } catch {}

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Ficha de Matrícula 2026 — ${instName}</title>
  <style>
    :root {
      --bg: #0b1210;
      --card: #13221e;
      --card-border: #1d332d;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --primary: #10b981;
      --primary-hover: #059669;
      --whatsapp: #25d366;
      --whatsapp-hover: #1da851;
      --blue: #3b82f6;
      --input-bg: #070d0b;
      --input-border: #26433b;
      --input-focus: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 12px; line-height: 1.5; font-size: 14px; }
    .container { max-width: 640px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; padding: 16px 12px; background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; }
    .admission-photo { width: 100%; height: clamp(80px, 21vw, 132px); object-fit: cover; display: block; border-radius: 8px; margin-bottom: 12px; }
    @media print { .admission-photo { display: none; } }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; margin-bottom: 6px; }
    h1 { font-size: 18px; color: #fff; margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); font-size: 12px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .card-title { font-size: 14px; font-weight: 700; color: #34d399; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--card-border); padding-bottom: 8px; }
    .row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .col { flex: 1 1 calc(50% - 10px); min-width: 140px; }
    .col-full { flex: 1 1 100%; }
    label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
    label .req { color: #f87171; }
    input[type="text"], input[type="date"], input[type="number"], input[type="email"], select {
      width: 100%; background: var(--input-bg); border: 1px solid var(--input-border); color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    input:focus, select:focus { border-color: var(--input-focus); box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
    .radio-group, .check-group { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
    .radio-label, .check-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text); cursor: pointer; text-transform: none; }
    input[type="radio"], input[type="checkbox"] { accent-color: var(--primary); width: 16px; height: 16px; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: background-color 0.2s; text-decoration: none; text-align: center; }
    .btn-whatsapp { background: var(--whatsapp); color: #000; }
    .btn-whatsapp:hover { background: var(--whatsapp-hover); }
    .btn-blue { background: var(--blue); color: #fff; }
    .btn-primary { background: var(--primary); color: #000; }
    .btn-primary:hover { background: var(--primary-hover); }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 1000; justify-content: center; align-items: center; padding: 16px; }
    .modal-content { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 20px; max-width: 440px; width: 100%; text-align: center; }
    .qr-box { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin: 16px 0; }
    .close-btn { background: #334155; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .info-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; font-size: 12px; color: #a7f3d0; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${photoMarkup}
      <div class="badge">Año Académico 2026</div>
      <h1>${instName}</h1>
      <p class="subtitle">FICHA DE MATRÍCULA Y REGISTRO DE DATOS 2026</p>
    </div>

    <form id="admissionForm">
      <!-- 1. Programa y Carrera -->
      <div class="card">
        <div class="card-title">📚 Programa de Estudios y Turno</div>
        <div class="row">
          <div class="col-full">
            <label>Programa de Estudios <span class="req">*</span></label>
            <select id="programaEstudios" required>
              <option value="PELUQUERÍA Y BARBERÍA">PELUQUERÍA Y BARBERÍA</option>
              <option value="COMPUTACIÓN E INFORMÁTICA">COMPUTACIÓN E INFORMÁTICA</option>
              <option value="MECÁNICA AUTOMOTRIZ">MECÁNICA AUTOMOTRIZ</option>
              <option value="MECÁNICA DE MOTOS Y VEHÍCULOS AFINES">MECÁNICA DE MOTOS Y VEHÍCULOS AFINES</option>
              <option value="CORTE Y ENSAMBLAJE">CORTE Y ENSAMBLAJE</option>
              <option value="CONFECCIÓN INDUSTRIAL">CONFECCIÓN INDUSTRIAL</option>
              <option value="INSTALACIONES ELÉCTRICAS">INSTALACIONES ELÉCTRICAS</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Turno <span class="req">*</span></label>
            <select id="turno" required>
              <option value="MAÑANA">Mañana</option>
              <option value="TARDE">Tarde</option>
              <option value="NOCHE">Noche</option>
            </select>
          </div>
          <div class="col">
            <label>Módulo / Especialidad</label>
            <input type="text" id="especialidad" placeholder="Ej. Módulo I o Módulo II" value="MÓDULO I">
          </div>
        </div>
      </div>

      <!-- 2. Datos Personales -->
      <div class="card">
        <div class="card-title">👤 Identificación del Estudiante</div>
        <div class="row">
          <div class="col">
            <label>DNI / Documento <span class="req">*</span></label>
            <input type="text" id="documentoIdentidad" maxlength="12" placeholder="8 dígitos" required>
          </div>
          <div class="col">
            <label>Sexo <span class="req">*</span></label>
            <div class="radio-group" style="padding-top:6px;">
              <label class="radio-label"><input type="radio" name="sexo" value="F" checked> Femenino</label>
              <label class="radio-label"><input type="radio" name="sexo" value="M"> Masculino</label>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Apellido Paterno <span class="req">*</span></label>
            <input type="text" id="apellidoPaterno" required>
          </div>
          <div class="col">
            <label>Apellido Materno <span class="req">*</span></label>
            <input type="text" id="apellidoMaterno" required>
          </div>
        </div>
        <div class="row">
          <div class="col-full">
            <label>Nombres Completos <span class="req">*</span></label>
            <input type="text" id="nombres" required>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Fecha de Nacimiento <span class="req">*</span></label>
            <input type="date" id="fechaNacimiento" required value="2004-05-15">
          </div>
          <div class="col">
            <label>Edad Calculada</label>
            <input type="number" id="edad" readonly style="background:#111b18; color:#34d399; font-weight:700;">
          </div>
        </div>
      </div>

      <!-- 3. Origen y Domicilio -->
      <div class="card">
        <div class="card-title">🏠 Residencia y Contacto</div>
        <div class="row">
          <div class="col">
            <label>País</label>
            <input type="text" id="pais" value="PERU">
          </div>
          <div class="col">
            <label>Región / Dpto</label>
            <input type="text" id="region" value="PUNO">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Provincia</label>
            <input type="text" id="provincia" value="SAN ROMAN">
          </div>
          <div class="col">
            <label>Distrito</label>
            <input type="text" id="distrito" value="JULIACA">
          </div>
        </div>
        <div class="row">
          <div class="col-full">
            <label>Domicilio (Av. / Jr. / Calle / Barrio / Nro) <span class="req">*</span></label>
            <input type="text" id="domicilio" placeholder="Ej. Jr. Mariano Nuñez 340" required>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>Teléfono Móvil (WhatsApp) <span class="req">*</span></label>
            <input type="text" id="telefono" maxlength="9" placeholder="9 dígitos" required>
          </div>
          <div class="col">
            <label>Correo Electrónico</label>
            <input type="email" id="correoElectronico" placeholder="opcional">
          </div>
        </div>
        <div class="row">
          <div class="col-full">
            <label>Contacto Familiar de Emergencia (Nombre y Teléfono) <span class="req">*</span></label>
            <input type="text" id="contactoEmergencia" placeholder="Ej. Papá: Carlos Mamani 951234567" required>
          </div>
        </div>
      </div>

      <!-- 4. Socioeconómico y Conectividad -->
      <div class="card">
        <div class="card-title">💼 Datos Socioeducativos y Conectividad</div>
        <div class="row">
          <div class="col">
            <label>Estado Civil</label>
            <select id="estadoCivil">
              <option value="SOLTERO">Soltero(a)</option>
              <option value="CASADO">Casado(a)</option>
              <option value="CONVIVIENTE">Conviviente</option>
              <option value="DIVORCIADO">Divorciado(a)</option>
              <option value="VIUDO">Viudo(a)</option>
            </select>
          </div>
          <div class="col">
            <label>Grado de Estudios</label>
            <select id="gradoEstudios">
              <option value="SECUNDARIA COMPLETA">Secundaria Completa</option>
              <option value="SECUNDARIA INCOMPLETA">Secundaria Incompleta</option>
              <option value="SUPERIOR">Superior Técnico / Univ.</option>
              <option value="PRIMARIA">Primaria</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>¿Trabaja actualmente?</label>
            <div class="radio-group">
              <label class="radio-label"><input type="radio" name="trabaja" value="0" checked> No</label>
              <label class="radio-label"><input type="radio" name="trabaja" value="1"> Sí</label>
            </div>
          </div>
          <div class="col" id="colPuesto" style="display:none;">
            <label>Puesto u Ocupación</label>
            <input type="text" id="puestoTrabajo" placeholder="Ocupación">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>¿Tiene carga familiar (hijos/dependientes)?</label>
            <div class="radio-group">
              <label class="radio-label"><input type="radio" name="cargaFamiliar" value="0" checked> No</label>
              <label class="radio-label"><input type="radio" name="cargaFamiliar" value="1"> Sí</label>
            </div>
          </div>
          <div class="col" id="colCargaPersonas" style="display:none;">
            <label>Nro. personas a cargo</label>
            <input type="number" id="cargaFamiliarPersonas" min="0" value="0">
          </div>
        </div>
        <div class="row">
          <div class="col">
            <label>¿Tiene internet fijo en casa?</label>
            <div class="radio-group">
              <label class="radio-label"><input type="radio" name="internetCasa" value="1" checked> Sí</label>
              <label class="radio-label"><input type="radio" name="internetCasa" value="0"> No</label>
            </div>
          </div>
          <div class="col">
            <label>Operador Celular</label>
            <select id="operadorCelular">
              <option value="CLARO">Claro</option>
              <option value="MOVISTAR">Movistar</option>
              <option value="ENTEL">Entel</option>
              <option value="BITEL">Bitel</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div class="col-full">
            <label>Equipos que dispone para aprender:</label>
            <div class="check-group">
              <label class="check-label"><input type="checkbox" id="equipoCelular" checked> Celular</label>
              <label class="check-label"><input type="checkbox" id="equipoLaptop"> Laptop</label>
              <label class="check-label"><input type="checkbox" id="equipoPC"> Computadora PC</label>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Inclusión -->
      <div class="card">
        <div class="card-title">🌐 Inclusión y Lengua Materna</div>
        <div class="row">
          <div class="col">
            <label>¿Presenta alguna discapacidad?</label>
            <div class="radio-group">
              <label class="radio-label"><input type="radio" name="discapacidad" value="0" checked> No</label>
              <label class="radio-label"><input type="radio" name="discapacidad" value="1"> Sí</label>
            </div>
          </div>
          <div class="col" id="colDiscapacidad" style="display:none;">
            <label>Detalle discapacidad</label>
            <input type="text" id="tipoDiscapacidad" placeholder="Detalle">
          </div>
        </div>
        <div class="row">
          <div class="col-full">
            <label>Lengua materna aprendida en la infancia</label>
            <select id="lenguaOriginaria">
              <option value="QUECHUA">Quechua</option>
              <option value="AYMARA">Aymara</option>
              <option value="CASTELLANO" selected>Castellano</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 5. Configuración de Envío a Secretaría -->
      <div class="card" style="border-color:#10b981;">
        <div class="card-title">📲 Destino de Envío (Secretaría del CETPRO)</div>
        <div class="row">
          <div class="col-full">
            <label>Número de WhatsApp de ${receptorNombre} (Opcional si elige el contacto en WhatsApp)</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <span style="background:#070d0b; border:1px solid #26433b; color:#34d399; padding:10px 12px; border-radius:8px; font-weight:700; font-size:14px;">+51</span>
              <input type="text" id="secretariaPhoneInput" maxlength="11" placeholder="Ej. 987654321 (o deje vacío para elegir contacto)" value="${displayPhone9}" style="font-weight:700; letter-spacing:0.5px;">
            </div>
            <p style="font-size:11px; color:var(--text-muted); margin-top:6px;">
              💡 Si la Secretaría cambió de número hoy, puede escribir el nuevo número de 9 dígitos aquí, o dejarlo vacío para seleccionar el contacto directamente en su WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="actions">
        <button type="button" class="btn btn-whatsapp" id="btnWhatsApp">
          💬 Enviar Ficha por WhatsApp a Secretaría
        </button>
        <button type="button" class="btn" id="btnPrintPdf" style="background:#f59e0b; color:#000;">
          🖨️ Descargar / Imprimir mi Ficha Oficial PDF 2026 (En Bold)
        </button>
        <button type="button" class="btn" id="btnWhatsAppChoose" style="background:#1e293b; color:#34d399; border:1px solid #10b981;">
          👥 Elegir Contacto en mi WhatsApp (Sin número fijo)
        </button>
        <button type="button" class="btn btn-primary" id="btnSubmitLocal">
          🚀 Enviar Directo al Sistema por Wi-Fi / Red Local
        </button>
        <button type="button" class="btn btn-blue" id="btnQr">
          📷 Ver Código QR Inverso / Copiar Texto
        </button>
        <button type="button" class="btn" id="btnResetForm" style="background:#334155; color:#e2e8f0; font-size:12px; padding:10px;">
          🧹 Limpiar Datos del Formulario (Nueva Ficha)
        </button>
      </div>
    </form>
  </div>

  <!-- Modal QR Inverso -->
  <div class="modal" id="qrModal">
    <div class="modal-content">
      <h2 style="font-size:16px; margin-bottom:6px; color:#fff;">Código de su Ficha 2026</h2>
      <p style="font-size:12px; color:var(--text-muted);">Puede mostrar esta pantalla en Secretaría o copiar el mensaje completo para pegarlo en WhatsApp:</p>
      <div class="qr-box" id="qrContainer"></div>
      <div class="info-box" id="qrSummary"></div>
      <div style="display:flex; gap:8px; justify-content:center; margin-top:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btnCopyModal" style="padding:10px 16px; font-size:12px;">📋 Copiar Mensaje Completo</button>
        <button type="button" class="close-btn" onclick="document.getElementById('qrModal').style.display='none'">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- Modal Confirmación Local -->
  <div class="modal" id="successModal">
    <div class="modal-content">
      <div style="font-size:40px; margin-bottom:8px;">✅</div>
      <h2 style="font-size:16px; color:#34d399; margin-bottom:6px;">¡Ficha Enviada con Éxito!</h2>
      <p style="font-size:13px; color:#fff; margin-bottom:12px;" id="successMsg"></p>
      <div class="info-box" id="successReceipt" style="font-weight:700; font-size:14px;"></div>
      <button type="button" class="close-btn" onclick="document.getElementById('successModal').style.display='none'" style="margin-top:16px;">Aceptar</button>
    </div>
  </div>

  <script>
    const DEFAULT_SECRETARIA_PHONE = "${displayPhone9}";

    // Si la URL del QR trae ?wa=..., o si el servidor local responde en /api/public/admission-ficha/info, actualizar el número automáticamente
    (function syncSecretariaPhone() {
      const phoneInput = document.getElementById('secretariaPhoneInput');
      try {
        const params = new URLSearchParams(window.location.search);
        const waParam = (params.get('wa') || '').replace(/\\D/g, '');
        if (waParam) {
          phoneInput.value = waParam.startsWith('51') && waParam.length === 11 ? waParam.slice(2) : waParam;
        }
      } catch (e) {}

      fetch('/api/public/admission-ficha/info')
        .then(r => r.ok ? r.json() : null)
        .then(info => {
          if (info && info.secretariaWhatsapp) {
            const digits = String(info.secretariaWhatsapp).replace(/\\D/g, '');
            if (digits && digits !== '51951234567' && digits !== '951234567') {
              phoneInput.value = digits.startsWith('51') && digits.length === 11 ? digits.slice(2) : digits;
            }
          }
        })
        .catch(() => {});
    })();

    // Cálculo automático de edad
    const fnInput = document.getElementById('fechaNacimiento');
    const edadInput = document.getElementById('edad');
    function updateAge() {
      const val = fnInput.value;
      if (!val) return;
      const b = new Date(val + 'T00:00:00Z');
      const now = new Date();
      let age = now.getUTCFullYear() - b.getUTCFullYear();
      const dm = now.getUTCMonth() - b.getUTCMonth();
      if (dm < 0 || (dm === 0 && now.getUTCDate() < b.getUTCDate())) age = age - 1;
      edadInput.value = Math.max(14, age);
    }
    fnInput.addEventListener('change', updateAge);
    updateAge();

    // Toggle condicionales
    document.querySelectorAll('input[name="trabaja"]').forEach(r => r.addEventListener('change', e => {
      document.getElementById('colPuesto').style.display = e.target.value === '1' ? 'block' : 'none';
    }));
    document.querySelectorAll('input[name="cargaFamiliar"]').forEach(r => r.addEventListener('change', e => {
      document.getElementById('colCargaPersonas').style.display = e.target.value === '1' ? 'block' : 'none';
    }));
    document.querySelectorAll('input[name="discapacidad"]').forEach(r => r.addEventListener('change', e => {
      document.getElementById('colDiscapacidad').style.display = e.target.value === '1' ? 'block' : 'none';
    }));

    // Checksum CRC32 cliente
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[i] = c >>> 0;
    }
    function calcCrc32(str) {
      const buf = new TextEncoder().encode(str);
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
      return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }

    function collectData() {
      const form = document.getElementById('admissionForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return null;
      }
      return {
        programaEstudios: document.getElementById('programaEstudios').value,
        turno: document.getElementById('turno').value,
        especialidad: document.getElementById('especialidad').value || 'MÓDULO I',
        documentoIdentidad: document.getElementById('documentoIdentidad').value.trim(),
        sexo: document.querySelector('input[name="sexo"]:checked').value,
        apellidoPaterno: document.getElementById('apellidoPaterno').value.trim().toUpperCase(),
        apellidoMaterno: document.getElementById('apellidoMaterno').value.trim().toUpperCase(),
        nombres: document.getElementById('nombres').value.trim().toUpperCase(),
        fechaNacimiento: document.getElementById('fechaNacimiento').value,
        edad: Number(document.getElementById('edad').value) || 18,
        pais: document.getElementById('pais').value.trim().toUpperCase() || 'PERU',
        region: document.getElementById('region').value.trim().toUpperCase() || 'PUNO',
        provincia: document.getElementById('provincia').value.trim().toUpperCase() || 'SAN ROMAN',
        distrito: document.getElementById('distrito').value.trim().toUpperCase() || 'JULIACA',
        domicilio: document.getElementById('domicilio').value.trim().toUpperCase(),
        telefono: document.getElementById('telefono').value.trim(),
        correoElectronico: document.getElementById('correoElectronico').value.trim(),
        contactoEmergencia: document.getElementById('contactoEmergencia').value.trim().toUpperCase(),
        estadoCivil: document.getElementById('estadoCivil').value,
        gradoEstudios: document.getElementById('gradoEstudios').value,
        trabaja: document.querySelector('input[name="trabaja"]:checked').value === '1',
        puestoTrabajo: document.getElementById('puestoTrabajo').value.trim().toUpperCase(),
        cargaFamiliar: document.querySelector('input[name="cargaFamiliar"]:checked').value === '1',
        cargaFamiliarPersonas: Number(document.getElementById('cargaFamiliarPersonas').value) || 0,
        internetCasa: document.querySelector('input[name="internetCasa"]:checked').value === '1',
        operadorCelular: document.getElementById('operadorCelular').value,
        equipoCelular: document.getElementById('equipoCelular').checked,
        equipoLaptop: document.getElementById('equipoLaptop').checked,
        equipoPC: document.getElementById('equipoPC').checked,
        discapacidad: document.querySelector('input[name="discapacidad"]:checked').value === '1',
        tipoDiscapacidad: document.getElementById('tipoDiscapacidad').value.trim().toUpperCase(),
        lenguaOriginaria: document.getElementById('lenguaOriginaria').value
      };
    }

    function createCompactPayload(p) {
      const compact = {
        v: 1, dni: p.documentoIdentidad, pat: p.apellidoPaterno, mat: p.apellidoMaterno, nom: p.nombres,
        sex: p.sexo, fn: p.fechaNacimiento, ed: p.edad, pa: p.pais, lug: p.region + '/' + p.provincia + '/' + p.distrito,
        dis: p.distrito, pro: p.provincia, reg: p.region, dom: p.domicilio, tra: p.trabaja ? 1 : 0, pto: p.puestoTrabajo || '',
        civ: p.estadoCivil, tel: p.telefono, cor: p.correoElectronico || '', eme: p.contactoEmergencia, gra: p.gradoEstudios,
        cfg: p.cargaFamiliar ? 1 : 0, cfp: p.cargaFamiliarPersonas || 0, net: p.internetCasa ? 1 : 0, ope: p.operadorCelular,
        pc: p.equipoPC ? 1 : 0, lap: p.equipoLaptop ? 1 : 0, cel: p.equipoCelular ? 1 : 0, dsc: p.discapacidad ? 1 : 0,
        dst: p.tipoDiscapacidad || '', len: p.lenguaOriginaria, prg: p.programaEstudios, esp: p.especialidad || '', tur: p.turno, ins: ''
      };
      const json = JSON.stringify(compact);
      const crc = calcCrc32(json);
      const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      return 'CETPRO2026:v1:' + crc + ':' + b64;
    }

    function buildFullWhatsappText(data) {
      const token = createCompactPayload(data);
      const text = '🎓 *CETPRO "MICAELA BASTIDAS" — FICHA DE MATRÍCULA 2026*\\n' +
        '--------------------------------------------------\\n' +
        '👤 *Estudiante:* ' + data.apellidoPaterno + ' ' + data.apellidoMaterno + ', ' + data.nombres + '\\n' +
        '📄 *DNI:* ' + data.documentoIdentidad + '\\n' +
        '📚 *Programa:* ' + data.programaEstudios + '\\n' +
        '⏰ *Turno:* ' + data.turno + '\\n' +
        '📱 *Teléfono:* ' + data.telefono + '\\n' +
        '🏠 *Domicilio:* ' + data.domicilio + '\\n' +
        '--------------------------------------------------\\n' +
        '⚠️ *BLOQUE TÉCNICO DE IMPORTACIÓN AUTOMÁTICA:*\\n' +
        '(Secretaría: copie todo este mensaje y péguelo en el sistema)\\n\\n' +
        '---INICIO-FICHA-CETPRO-2026---\\n' +
        token + '\\n' +
        '---FIN-FICHA-CETPRO-2026---';
      return { token, text };
    }

    function trySilentSubmit(data) {
      try {
        fetch('/api/public/admission-ficha/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
      } catch (e) {}
    }

    // Botón WhatsApp (usa el número configurado o abre selector de contactos si está vacío)
    document.getElementById('btnWhatsApp').addEventListener('click', () => {
      const data = collectData();
      if (!data) return;
      trySilentSubmit(data);
      const { text } = buildFullWhatsappText(data);
      const rawInput = (document.getElementById('secretariaPhoneInput').value || '').replace(/\\D/g, '');
      let phone = '';
      if (rawInput.length === 9) phone = '51' + rawInput;
      else if (rawInput.length >= 10) phone = rawInput;

      if (phone && phone !== '51951234567') {
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank');
      } else {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
      }
    });

    // Botón Elegir Contacto en WhatsApp (sin número fijo)
    document.getElementById('btnWhatsAppChoose').addEventListener('click', () => {
      const data = collectData();
      if (!data) return;
      trySilentSubmit(data);
      const { text } = buildFullWhatsappText(data);
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });

    // Función de Impresión Oficial A4 100% Autónoma (Funciona sin servidor / desde archivo .html en WhatsApp)
    function printOfficialFicha2026Offline(d) {
      const code = 'INS-2026-' + String(d.documentoIdentidad || '0001').slice(-4);
      const isM = d.sexo === 'M';
      const isF = d.sexo !== 'M';
      const civ = String(d.estadoCivil || 'SOLTERO').toUpperCase();
      const rawLen = String(d.lenguaOriginaria || 'CASTELLANO').toUpperCase();
      const lenStr = rawLen.includes('CASTELLANO') ? rawLen : ('CASTELLANO, ' + rawLen);
      const htmlPrint = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>FICHA_REGISTRO_2026_' + d.documentoIdentidad + '</title>' +
        '<style>' +
        '@page { size: A4 portrait; margin: 10mm; }' +
        '* { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #000; }' +
        'body { background: #fff; margin: 0; padding: 12px; font-size: 11px; }' +
        '.no-print { background: #0b1210; color: #fff; padding: 12px; border-radius: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }' +
        '.no-print button { background: #10b981; color: #000; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 13px; }' +
        '@media print { .no-print { display: none !important; } body { padding: 0; } }' +
        '.sheet { max-width: 190mm; margin: 0 auto; border: 2px solid #000; padding: 14px; }' +
        '.hdr { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }' +
        '.hdr h2 { margin: 2px 0; font-size: 14px; font-weight: 900; }' +
        '.hdr h3 { margin: 2px 0; font-size: 12px; font-weight: 800; }' +
        '.sec-title { background: #e2e8f0; font-weight: 900; padding: 5px 8px; border: 1px solid #000; margin-top: 8px; font-size: 11px; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: -1px; }' +
        'td, th { border: 1px solid #000; padding: 5px 6px; vertical-align: middle; font-size: 10.5px; }' +
        '.lbl { font-weight: 600; color: #1e293b; font-size: 9.5px; display: block; text-transform: uppercase; }' +
        '.val { font-weight: 900; font-size: 11.5px; color: #000; display: block; margin-top: 1px; text-transform: uppercase; }' +
        '.box-x { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #000; text-align: center; line-height: 14px; font-weight: 900; margin-left: 4px; margin-right: 8px; }' +
        '.sig-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 10px; }' +
        '.huella { width: 85px; height: 105px; border: 1.5px solid #000; text-align: center; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; font-size: 9px; font-weight: 700; }' +
        '</style></head><body>' +
        '<div class="no-print">' +
        '<span style="color:#fff;font-weight:700;">📄 Vista Oficial de Impresión en BOLD — Lista para Imprimir o Guardar como PDF</span>' +
        '<div><button onclick="window.print()">🖨️ Imprimir / Guardar PDF Ahora</button> <button onclick="window.close()" style="background:#475569;color:#fff;margin-left:6px;">Cerrar</button></div>' +
        '</div>' +
        '<div class="sheet">' +
        '<div class="hdr">' +
        '<div style="font-size:10px;font-weight:700;">MINISTERIO DE EDUCACIÓN — DIRECCIÓN REGIONAL DE EDUCACIÓN PUNO — UGEL SAN ROMÁN</div>' +
        '<h2>CETPRO "MICAELA BASTIDAS" — JULIACA</h2>' +
        '<h3>FICHA DE REGISTRO DE DATOS DE ESTUDIANTES 2026</h3>' +
        '<div style="text-align:right;font-size:11px;margin-top:4px;">CÓDIGO DE INSCRIPCIÓN: <strong style="font-size:12px;border:1px solid #000;padding:2px 8px;">' + code + '</strong></div>' +
        '</div>' +
        '<div class="sec-title">I. INFORMACIÓN DE LA INSTITUCIÓN Y PROGRAMA DE ESTUDIOS</div>' +
        '<table>' +
        '<tr><td width="50%"><span class="lbl">Correo Institucional:</span><span class="val">cetpromicaelabastidas@gmail.com</span></td>' +
        '<td width="50%"><span class="lbl">Página Web:</span><span class="val">www.cetpromicaelabastidas.edu.pe</span></td></tr>' +
        '<tr><td><span class="lbl">Programa de Estudios:</span><span class="val">' + d.programaEstudios + '</span></td>' +
        '<td><span class="lbl">Nivel Formativo:</span><span class="val">AUXILIAR TÉCNICO</span></td></tr>' +
        '<tr><td><span class="lbl">Módulo / Especialidad:</span><span class="val">' + d.especialidad + '</span></td>' +
        '<td><span class="lbl">Turno:</span><span class="val">' + d.turno + '</span></td></tr>' +
        '</table>' +
        '<div class="sec-title">II. DATOS PERSONALES Y SOCIOEDUCATIVOS DEL ESTUDIANTE (LLENADO EN BOLD)</div>' +
        '<table>' +
        '<tr><td width="33%"><span class="lbl">Apellido Paterno:</span><span class="val">' + d.apellidoPaterno + '</span></td>' +
        '<td width="33%"><span class="lbl">Apellido Materno:</span><span class="val">' + d.apellidoMaterno + '</span></td>' +
        '<td width="34%"><span class="lbl">Nombres Completos:</span><span class="val">' + d.nombres + '</span></td></tr>' +
        '<tr><td><span class="lbl">Sexo:</span><div style="margin-top:2px;font-weight:800;">H <span class="box-x">' + (isM ? 'X' : '&nbsp;') + '</span> M <span class="box-x">' + (isF ? 'X' : '&nbsp;') + '</span></div></td>' +
        '<td><span class="lbl">Documento de Identidad (DNI):</span><span class="val">' + d.documentoIdentidad + '</span></td>' +
        '<td><span class="lbl">Fecha de Nacimiento / Edad:</span><span class="val">' + d.fechaNacimiento + ' (' + d.edad + ' AÑOS)</span></td></tr>' +
        '<tr><td><span class="lbl">País:</span><span class="val">' + d.pais + '</span></td>' +
        '<td><span class="lbl">Región / Provincia:</span><span class="val">' + d.region + ' / ' + d.provincia + '</span></td>' +
        '<td><span class="lbl">Distrito:</span><span class="val">' + d.distrito + '</span></td></tr>' +
        '<tr><td colspan="3"><span class="lbl">Domicilio Actual (Av. / Jr. / Calle / Barrio):</span><span class="val">' + d.domicilio + '</span></td></tr>' +
        '<tr><td><span class="lbl">¿Trabaja Actualmente?:</span><div style="margin-top:2px;font-weight:800;">SÍ <span class="box-x">' + (d.trabaja ? 'X' : '&nbsp;') + '</span> NO <span class="box-x">' + (!d.trabaja ? 'X' : '&nbsp;') + '</span></div></td>' +
        '<td colspan="2"><span class="lbl">Puesto de Trabajo / Ocupación:</span><span class="val">' + (d.trabaja ? (d.puestoTrabajo || 'INDEPENDIENTE') : 'NO APLICA') + '</span></td></tr>' +
        '<tr><td><span class="lbl">Estado Civil:</span><span class="val">' + civ + '</span></td>' +
        '<td><span class="lbl">Teléfono Celular / WhatsApp:</span><span class="val">' + d.telefono + '</span></td>' +
        '<td><span class="lbl">Correo Electrónico:</span><span class="val" style="text-transform:lowercase;">' + (d.correoElectronico || 'No registra') + '</span></td></tr>' +
        '<tr><td colspan="2"><span class="lbl">Contacto Familiar de Emergencia:</span><span class="val">' + d.contactoEmergencia + '</span></td>' +
        '<td><span class="lbl">Grado de Estudios:</span><span class="val">' + d.gradoEstudios + '</span></td></tr>' +
        '<tr><td><span class="lbl">¿Carga Familiar?:</span><div style="margin-top:2px;font-weight:800;">SÍ <span class="box-x">' + (d.cargaFamiliar ? 'X' : '&nbsp;') + '</span> NO <span class="box-x">' + (!d.cargaFamiliar ? 'X' : '&nbsp;') + '</span> (N°: <strong>' + (d.cargaFamiliar ? d.cargaFamiliarPersonas : 0) + '</strong>)</div></td>' +
        '<td><span class="lbl">¿Internet en Casa?:</span><div style="margin-top:2px;font-weight:800;">SÍ <span class="box-x">' + (d.internetCasa ? 'X' : '&nbsp;') + '</span> NO <span class="box-x">' + (!d.internetCasa ? 'X' : '&nbsp;') + '</span></div></td>' +
        '<td><span class="lbl">Operador Celular:</span><span class="val">' + d.operadorCelular + '</span></td></tr>' +
        '<tr><td colspan="2"><span class="lbl">Equipos Disponibles:</span><div style="margin-top:2px;font-weight:800;">PC <span class="box-x">' + (d.equipoPC ? 'X' : '&nbsp;') + '</span> LAPTOP <span class="box-x">' + (d.equipoLaptop ? 'X' : '&nbsp;') + '</span> CELULAR <span class="box-x">' + (d.equipoCelular ? 'X' : '&nbsp;') + '</span></div></td>' +
        '<td><span class="lbl">Lengua Materna:</span><span class="val">' + lenStr + '</span></td></tr>' +
        '<tr><td><span class="lbl">¿Presenta Discapacidad?:</span><div style="margin-top:2px;font-weight:800;">SÍ <span class="box-x">' + (d.discapacidad ? 'X' : '&nbsp;') + '</span> NO <span class="box-x">' + (!d.discapacidad ? 'X' : '&nbsp;') + '</span></div></td>' +
        '<td colspan="2"><span class="lbl">Detalle de Discapacidad:</span><span class="val">' + (d.discapacidad ? (d.tipoDiscapacidad || 'ESPECIFICADA') : 'NINGUNA') + '</span></td></tr>' +
        '</table>' +
        '<p style="font-size:9.5px;margin-top:10px;text-align:justify;">Declaro bajo juramento que los datos consignados en la presente Ficha de Registro de Matrícula 2026 son verdaderos y me comprometo a cumplir las normas institucionales del CETPRO "Micaela Bastidas".</p>' +
        '<div class="sig-area">' +
        '<div style="font-size:10.5px;font-weight:700;">Juliaca, ' + new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) + '</div>' +
        '<div style="text-align:center;width:200px;border-top:1.5px solid #000;padding-top:4px;font-weight:800;font-size:10px;">FIRMA DEL ESTUDIANTE<br>DNI N° ' + d.documentoIdentidad + '</div>' +
        '<div class="huella">HUELLA DIGITAL</div>' +
        '</div></div>' +
        '<script>setTimeout(function(){ try { window.print(); } catch(e){} }, 350);<\\/script>' +
        '</body></html>';
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(htmlPrint);
        w.document.close();
      } else {
        const blob = new Blob([htmlPrint], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'FICHA_IMPRIMIR_2026_' + d.documentoIdentidad + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }

    // Botón Descargar / Imprimir Ficha Oficial PDF 2026 en Bold
    document.getElementById('btnPrintPdf').addEventListener('click', async () => {
      const data = collectData();
      if (!data) return;
      trySilentSubmit(data);
      const btn = document.getElementById('btnPrintPdf');
      const originalText = btn.innerText;
      try {
        btn.disabled = true;
        btn.innerText = '⏳ Generando Ficha Oficial 2026 en Bold...';
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
          const res = await fetch('/api/public/admission-ficha/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).catch(() => null);
          if (res && res.ok) {
            const blob = await res.blob();
            const pdfUrl = URL.createObjectURL(blob);
            const win = window.open(pdfUrl, '_blank');
            if (!win) {
              const a = document.createElement('a');
              a.href = pdfUrl;
              a.download = 'FICHA_REGISTRO_2026_' + (data.documentoIdentidad || 'ESTUDIANTE') + '.pdf';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
            return;
          }
        }
        // Modo 100% autónomo cuando se abre desde archivo .html enviado por WhatsApp o con servidor apagado
        printOfficialFicha2026Offline(data);
      } catch (e) {
        printOfficialFicha2026Offline(data);
      } finally {
        btn.disabled = false;
        btn.innerText = originalText;
      }
    });

    // Botón Limpiar Formulario
    document.getElementById('btnResetForm').addEventListener('click', () => {
      document.getElementById('admissionForm').reset();
      document.getElementById('colPuesto').style.display = 'none';
      document.getElementById('colCargaPersonas').style.display = 'none';
      document.getElementById('colDiscapacidad').style.display = 'none';
      updateAge();
    });

    // Botón QR Inverso / Copiar (100% Autónomo Offline + Fallback)
    ${embeddedQrJs}
    let lastModalText = '';
    document.getElementById('btnQr').addEventListener('click', async () => {
      const data = collectData();
      if (!data) return;
      trySilentSubmit(data);
      const { token, text } = buildFullWhatsappText(data);
      lastModalText = text;
      const box = document.getElementById('qrContainer');
      try {
        if (typeof generateQrSvg === 'function') {
          const svg = generateQrSvg(token);
          box.innerHTML = '<div style="width:200px;height:200px;margin:0 auto 8px auto;">' + svg + '</div>' +
            '<div style="font-size:10px; word-break:break-all; font-family:monospace; max-width:260px; color:#000; border-top:1px solid #cbd5e1; padding-top:6px;">' + token + '</div>';
        } else {
          box.innerHTML = '<div style="font-size:11px; word-break:break-all; font-family:monospace; max-width:280px; color:#000;"><strong>CÓDIGO DE FICHA:</strong><br><br>' + token + '</div>';
        }
      } catch (e) {
        box.innerHTML = '<div style="font-size:11px; word-break:break-all; font-family:monospace; max-width:280px; color:#000;"><strong>CÓDIGO DE FICHA:</strong><br><br>' + token + '</div>';
      }
      document.getElementById('qrSummary').innerHTML = '<strong>' + data.apellidoPaterno + ' ' + data.apellidoMaterno + ', ' + data.nombres + '</strong><br>DNI: ' + data.documentoIdentidad + ' — ' + data.programaEstudios + ' (' + data.turno + ')';
      document.getElementById('qrModal').style.display = 'flex';
    });

    document.getElementById('btnCopyModal').addEventListener('click', () => {
      if (!lastModalText) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastModalText).then(() => {
          document.getElementById('btnCopyModal').innerText = '✅ ¡Mensaje Copiado!';
          setTimeout(() => { document.getElementById('btnCopyModal').innerText = '📋 Copiar Mensaje Completo'; }, 2500);
        });
      }
    });

    // Botón Enviar por Wi-Fi Local
    document.getElementById('btnSubmitLocal').addEventListener('click', async () => {
      const data = collectData();
      if (!data) return;
      try {
        const btn = document.getElementById('btnSubmitLocal');
        btn.disabled = true;
        btn.innerText = 'Enviando...';
        const res = await fetch('/api/public/admission-ficha/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        btn.disabled = false;
        btn.innerText = '🚀 Enviar Directo al Sistema por Wi-Fi / Red Local';
        if (res.ok && json.success) {
          document.getElementById('successMsg').innerText = json.message || 'Ficha recibida satisfactoriamente en la Bandeja de Secretaría.';
          document.getElementById('successReceipt').innerText = 'Código de Inscripción: ' + (json.receiptCode || 'INS-2026-OK');
          document.getElementById('successModal').style.display = 'flex';
        } else {
          alert('Aviso del CETPRO: ' + (json.error || 'No se pudo enviar por Wi-Fi. Utilice el botón de WhatsApp.'));
        }
      } catch (e) {
        document.getElementById('btnSubmitLocal').disabled = false;
        document.getElementById('btnSubmitLocal').innerText = '🚀 Enviar Directo al Sistema por Wi-Fi / Red Local';
        alert('No se pudo conectar directamente con el servidor local del CETPRO. Por favor presione el botón verde para enviar su ficha por WhatsApp.');
      }
    });
  </script>
</body>
</html>`;
}

// --- 8. MÉTODOS DE NEGOCIO Y PERSISTENCIA (EXPOSICIÓN API) ---
function detectBestLanIp() {
  let bestIp = '127.0.0.1';
  const candidates = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const isVirtual = /vethernet|wsl|virtualbox|vmware|vbox|docker|hyper-v|loopback/i.test(name);
      const isPreferred = /wi-fi|wlan|wireless|ethernet|eth/i.test(name);
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
          candidates.push({
            name,
            address: iface.address,
            score: (isPreferred ? 10 : 0) - (isVirtual ? 20 : 0)
          });
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length > 0) bestIp = candidates[0].address;
  } catch {}
  return bestIp;
}

function inferAdmissionScope(record) {
  if (!record || typeof record !== 'object') return null;
  if (record.scope && typeof record.scope === 'object' && record.scope.kind) return record.scope;
  const recId = String(record.id || '');
  if (recId === 'admissionConfig2026') {
    return { kind: 'admissionConfig', target: '2026' };
  }
  if (recId.startsWith('admissionSubmission:')) {
    return { kind: 'admissionSubmission', target: recId.slice('admissionSubmission:'.length) };
  }
  if (recId.startsWith('profile2026:')) {
    return { kind: 'profile2026', target: recId.slice('profile2026:'.length) };
  }
  return null;
}

function ensureAdmissionRecordsScoped(core) {
  if (!core || typeof core.records !== 'function' || typeof core.putRecord !== 'function') return 0;
  let fixed = 0;
  for (const r of (core.records('documentSettings') || [])) {
    if (r && (!r.scope || !r.scope.kind)) {
      const scope = inferAdmissionScope(r);
      if (scope) {
        core.putRecord('documentSettings', { ...r, scope, rev: r.rev || require('node:crypto').randomUUID() });
        fixed++;
      }
    }
  }
  return fixed;
}

function getConfig(core, user) {
  if (user) {
    core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  }
  ensureAdmissionRecordsScoped(core);
  const custom = core.record('documentSettings', 'admissionConfig2026')?.fields || {};
  const lanIp = detectBestLanIp();

  const programs = (core.records('programs') || []).map(p => ({
    id: p.id,
    name: p.nombre || p.name || p.id,
    code: p.code || p.id
  }));

  const port = Number(process.env.PORT || process.env.CETPRO_PORT) || 8085;
  const cleanPhone = normalizePeruWhatsapp(custom.secretariaWhatsapp || custom.whatsappPhone || '');
  const receptorNombre = custom.receptorNombre || 'Secretaría Académica';
  const publicFormUrl = String(custom.publicFormUrl || '').trim();
  const baseLocalUrl = 'http://' + lanIp + ':' + port + '/admision-qr';
  const localAdmissionUrl = cleanPhone ? (baseLocalUrl + '?wa=' + cleanPhone) : baseLocalUrl;

  let admissionUrl = localAdmissionUrl;
  if (publicFormUrl && /^https?:\/\//i.test(publicFormUrl)) {
    const sep = publicFormUrl.includes('?') ? '&' : '?';
    admissionUrl = cleanPhone ? (publicFormUrl + sep + 'wa=' + cleanPhone) : publicFormUrl;
  }

  return {
    secretariaWhatsapp: cleanPhone,
    whatsappPhone: cleanPhone,
    receptorNombre,
    publicFormUrl,
    isPublicUrlActive: Boolean(publicFormUrl && /^https?:\/\//i.test(publicFormUrl)),
    isWhatsappConfigured: Boolean(cleanPhone),
    institucion: custom.institucion || 'CETPRO "MICAELA BASTIDAS PUYUCAWA"',
    periodo: custom.periodo || '2026-I',
    lanIp,
    port,
    localAdmissionUrl,
    admissionUrl,
    lanUrl: admissionUrl,
    qrSvg: generateQrSvg(admissionUrl),
    programs
  };
}

function updateConfig(core, user, body) {
  core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  ensureAdmissionRecordsScoped(core);
  const current = core.record('documentSettings', 'admissionConfig2026') || {
    id: 'admissionConfig2026',
    type: 'admissionConfig',
    scope: { kind: 'admissionConfig', target: '2026' },
    fields: {}
  };
  const nextFields = { ...current.fields, ...body };
  if (body.secretariaWhatsapp !== undefined || body.whatsappPhone !== undefined) {
    const normalized = normalizePeruWhatsapp(body.secretariaWhatsapp ?? body.whatsappPhone ?? '');
    nextFields.secretariaWhatsapp = normalized;
    nextFields.whatsappPhone = normalized;
  }
  if (body.receptorNombre !== undefined) {
    nextFields.receptorNombre = String(body.receptorNombre || 'Secretaría Académica').trim();
  }
  if (body.publicFormUrl !== undefined) {
    nextFields.publicFormUrl = String(body.publicFormUrl || '').trim();
  }
  const updated = {
    ...current,
    id: 'admissionConfig2026',
    type: 'admissionConfig',
    scope: { kind: 'admissionConfig', target: '2026' },
    fields: nextFields
  };
  core.write(user, 'documentSettings', updated, current.rev);
  const fullConfig = getConfig(core, user);
  return { success: true, ok: true, config: updated.fields, ...fullConfig };
}

function getPublicInfo(core, query) {
  ensureAdmissionRecordsScoped(core);
  const custom = core.record('documentSettings', 'admissionConfig2026')?.fields || {};
  const cleanPhone = normalizePeruWhatsapp(custom.secretariaWhatsapp || custom.whatsappPhone || '');
  const programs = (core.records('programs') || []).map(p => ({
    id: p.id,
    name: p.nombre || p.name || p.id,
    code: p.code || p.id
  }));
  return {
    institucion: custom.institucion || 'CETPRO "MICAELA BASTIDAS PUYUCAWA"',
    institutionName: custom.institucion || 'CETPRO "MICAELA BASTIDAS PUYUCAWA"',
    secretariaWhatsapp: cleanPhone,
    whatsappPhone: cleanPhone,
    receptorNombre: custom.receptorNombre || 'Secretaría Académica',
    academicYear: 2026,
    year: 2026,
    periodo: custom.periodo || '2026-I',
    programs,
    turnos: ['MAÑANA', 'TARDE', 'NOCHE']
  };
}

function submitPublicFicha(core, body, clientIp) {
  if (!body) {
    const err = new Error('No se enviaron datos de postulación.');
    err.status = 400; throw err;
  }
  ensureAdmissionRecordsScoped(core);
  const profile = normalizeProfile2026(body, core);
  if (!profile.documentoIdentidad) {
    const err = new Error('El Documento de Identidad es obligatorio.');
    err.status = 400; throw err;
  }
  if (!profile.apellidoPaterno || !profile.nombres) {
    const err = new Error('Apellidos y nombres son obligatorios.');
    err.status = 400; throw err;
  }

  const submissionId = 'SUB-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const receiptCode = 'INS-2026-' + String(Math.floor(Math.random() * 9000) + 1000);
  profile.codigoInscripcion = receiptCode;

  const adminActor = core.records('users').find(u => u.role === 'DIRECTOR') || { id: 'usr-admin', role: 'DIRECTOR', name: 'Sistema Admisión' };
  const settingRecord = {
    id: 'admissionSubmission:' + submissionId,
    type: 'admissionSubmission',
    scope: { kind: 'admissionSubmission', target: submissionId },
    fields: {
      id: submissionId,
      submissionId,
      receiptCode,
      receivedAt: new Date().toISOString(),
      status: 'PENDIENTE',
      clientIp: clientIp || '127.0.0.1',
      profile
    }
  };

  core.write(adminActor, 'documentSettings', settingRecord);

  return {
    success: true,
    ok: true,
    submissionId,
    receiptCode,
    receivedAt: settingRecord.fields.receivedAt,
    documentoIdentidad: profile.documentoIdentidad,
    student: {
      documentoIdentidad: profile.documentoIdentidad,
      fullName: profile.apellidoPaterno + ' ' + profile.apellidoMaterno + ', ' + profile.nombres
    },
    message: 'Ficha recibida satisfactoriamente. Acérquese a Secretaría para validar su inscripción.'
  };
}

function importWhatsAppFicha(core, user, body) {
  core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  ensureAdmissionRecordsScoped(core);
  const rawText = body.rawText || body.text || body.token || '';
  if (!rawText) {
    const err = new Error('Debe proporcionar el texto o token copiado de WhatsApp.');
    err.status = 400; throw err;
  }
  const profile = decodeCompactPayload(rawText);
  const submissionId = 'SUB-WA-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const receiptCode = profile.codigoInscripcion || ('INS-2026-' + (profile.documentoIdentidad || '0001').slice(-4));
  profile.codigoInscripcion = receiptCode;
  if (profile.institucional) profile.institucional.codigoInscripcion = receiptCode;

  const settingRecord = {
    id: 'admissionSubmission:' + submissionId,
    type: 'admissionSubmission',
    scope: { kind: 'admissionSubmission', target: submissionId },
    fields: {
      id: submissionId,
      submissionId,
      receiptCode,
      receivedAt: new Date().toISOString(),
      status: 'PENDIENTE',
      source: 'WHATSAPP',
      documentoIdentidad: profile.documentoIdentidad,
      fullName: (profile.apellidoPaterno + ' ' + profile.apellidoMaterno + ', ' + profile.nombres).trim(),
      edad: profile.edad,
      programaEstudios: profile.programaEstudios,
      turno: profile.turno,
      telefono: profile.telefono,
      profile
    }
  };
  core.write(user, 'documentSettings', settingRecord);

  return {
    success: true,
    ok: true,
    crcValid: true,
    crcOk: true,
    submissionId,
    profile,
    warnings: []
  };
}

function generateSampleWhatsApp(core, user, body = {}) {
  core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  ensureAdmissionRecordsScoped(core);
  let profile = body.profile;
  if (!profile && body.studentId) {
    profile = normalizeProfile2026({}, core, body.studentId);
  }
  if (!profile && body.documentoIdentidad) {
    const st = core.records('students').find(s => s.document === body.documentoIdentidad);
    if (st) profile = normalizeProfile2026({}, core, st);
  }
  if (!profile) {
    const hasFields = body && (body.nombres || body.apellidoPaterno || body.dni);
    profile = normalizeProfile2026(hasFields ? body : {
      documentoIdentidad: '45678912',
      apellidoPaterno: 'QUISPE',
      apellidoMaterno: 'MAMANI',
      nombres: 'MARÍA ELENA',
      sexo: 'F',
      fechaNacimiento: '1992-05-15',
      edad: 34,
      pais: 'PERU',
      region: 'PUNO',
      provincia: 'SAN ROMÁN',
      distrito: 'SAN MIGUEL',
      lugarNacimiento: 'JULIACA / SAN ROMÁN / PUNO',
      domicilio: 'JR. LOS INCAS N° 450 - URB. LA CAPILLA',
      trabaja: true,
      puestoTrabajo: 'COMERCIANTE INDEPENDIENTE',
      estadoCivil: 'CASADO',
      telefono: '951234567',
      correoElectronico: 'maria.quispe92@gmail.com',
      contactoEmergencia: 'JUAN CONDORI (ESPOSO) - 951998877',
      gradoEstudios: 'SECUNDARIA COMPLETA',
      cargaFamiliar: true,
      cargaFamiliarPersonas: 2,
      internetCasa: true,
      operadorCelular: 'BITEL',
      equipoPC: false,
      equipoLaptop: false,
      equipoCelular: true,
      discapacidad: false,
      tipoDiscapacidad: '',
      lenguaOriginaria: 'QUECHUA',
      programaEstudios: 'PELUQUERÍA Y BARBERÍA',
      especialidad: 'Corte de Cabello, Barbería y Peinados',
      turno: 'MAÑANA',
      codigoInscripcion: 'INS-2026-8912'
    }, core);
  }
  const config = getConfig(core, user);
  const targetPhone = body.phoneNumber || config.secretariaWhatsapp;
  const res = generateWhatsAppMessage(profile, targetPhone);
  return { ...res, sampleText: res.message };
}

function listSubmissionsAndStudents(core, user) {
  core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  ensureAdmissionRecordsScoped(core);
  const submissions = (core.records('documentSettings') || [])
    .filter(s => s.id && s.id.startsWith('admissionSubmission:'))
    .map(s => {
      const f = s.fields || {};
      const p = f.profile || {};
      return {
        ...f,
        id: f.id || f.submissionId || s.id.replace('admissionSubmission:', ''),
        status: f.status || 'PENDIENTE',
        documentoIdentidad: f.documentoIdentidad || p.documentoIdentidad || '',
        fullName: f.fullName || ((p.apellidoPaterno || '') + ' ' + (p.apellidoMaterno || '') + ', ' + (p.nombres || '')).trim(),
        edad: f.edad || p.edad || 20,
        programaEstudios: f.programaEstudios || p.programaEstudios || p.institucional?.programaEstudios || 'PELUQUERÍA Y BARBERÍA',
        turno: f.turno || p.turno || p.institucional?.turno || 'MAÑANA',
        telefono: f.telefono || p.telefono || '',
        receivedAt: f.receivedAt || new Date().toISOString(),
        profile: p
      };
    })
    .sort((a, b) => (b.receivedAt || '').localeCompare(a.receivedAt || ''));

  const allStudents = (core.records('students') || [])
    .filter(s => s.active !== false && !s.archived);

  const studentsWithFicha = allStudents.map(s => {
    const customProfile = s.profile2026 || core.record('documentSettings', 'profile2026:' + s.id)?.fields;
    const normalized = normalizeProfile2026(customProfile || {}, core, s);
    return {
      id: s.id,
      document: s.document || normalized.documentoIdentidad,
      name: s.name || (normalized.apellidoPaterno + ' ' + normalized.apellidoMaterno + ', ' + normalized.nombres),
      programa: normalized.programaEstudios,
      turno: normalized.turno,
      hasFicha2026: Boolean(customProfile),
      profile: normalized
    };
  });

  return {
    submissions,
    students: studentsWithFicha,
    studentsWithFicha
  };
}

function saveAndEnrollFicha(core, user, body) {
  core.requireRole(user, ['DIRECTOR', 'SECRETARIA']);
  ensureAdmissionRecordsScoped(core);
  const profile = normalizeProfile2026(body.profile || body, core);
  if (!profile.documentoIdentidad) {
    const err = new Error('Documento de Identidad es obligatorio.');
    err.status = 400; throw err;
  }

  // 1. Guardar o actualizar en tabla students
  const existing = core.records('students').find(s => s.document === profile.documentoIdentidad);
  const studentPayload = {
    document: profile.documentoIdentidad,
    name: (profile.apellidoPaterno + ' ' + profile.apellidoMaterno + ', ' + profile.nombres).trim(),
    lastName1: profile.apellidoPaterno,
    lastName2: profile.apellidoMaterno,
    firstNames: profile.nombres,
    sex: profile.sexo === 'F' ? 'M' : 'H', // M = Mujer, H = Hombre en students table
    birthDate: profile.fechaNacimiento,
    documentType: 'DNI',
    active: true,
    profile2026: profile
  };

  let savedStudent;
  if (existing) {
    savedStudent = core.saveStudent(user, { ...existing, ...studentPayload, rev: existing.rev });
  } else {
    savedStudent = core.saveStudent(user, studentPayload);
  }

  // 2. Guardar perfil completo en documentSettings
  const profileSettingId = 'profile2026:' + savedStudent.id;
  const currentProfileSetting = core.record('documentSettings', profileSettingId);
  core.write(user, 'documentSettings', {
    id: profileSettingId,
    type: 'profile2026',
    scope: { kind: 'profile2026', target: savedStudent.id },
    fields: profile
  }, currentProfileSetting?.rev);

  // 3. Matricular en grupo si se especificó groupId
  let enrollment = null;
  if (body.groupId) {
    const existingEnrollment = core.records('enrollments').find(e => e.studentId === savedStudent.id && e.groupId === body.groupId && e.active);
    if (!existingEnrollment) {
      enrollment = core.enroll(user, {
        studentId: savedStudent.id,
        groupId: body.groupId,
        startDate: body.startDate || '2026-03-16',
        autoAdjustDate: true
      });
    } else {
      enrollment = existingEnrollment;
    }
  }

  // 4. Si viene de una postulación, actualizar estado a MATRICULADO
  if (body.submissionId) {
    const subRecord = core.record('documentSettings', 'admissionSubmission:' + body.submissionId);
    if (subRecord?.fields) {
      core.write(user, 'documentSettings', {
        ...subRecord,
        scope: subRecord.scope?.kind ? subRecord.scope : { kind: 'admissionSubmission', target: String(body.submissionId) },
        fields: {
          ...subRecord.fields,
          status: 'MATRICULADO',
          studentId: savedStudent.id,
          enrolledAt: new Date().toISOString()
        }
      }, subRecord.rev);
    }
  }

  return {
    success: true,
    studentId: savedStudent.id,
    student: savedStudent,
    enrolled: Boolean(enrollment),
    enrollment,
    message: 'Estudiante guardado' + (enrollment ? ' y matriculado' : '') + ' satisfactoriamente.'
  };
}

module.exports = {
  calculateCRC32,
  generateQrSvg,
  normalizeProfile2026,
  encodeCompactPayload,
  decodeCompactPayload,
  generateWhatsAppMessage,
  renderFichaRegistro2026PDF,
  generateStandaloneAdmissionHtml,
  ensureAdmissionRecordsScoped,
  getConfig,
  updateConfig,
  getPublicInfo,
  submitPublicFicha,
  importWhatsAppFicha,
  generateSampleWhatsApp,
  listSubmissionsAndStudents,
  saveAndEnrollFicha
};



