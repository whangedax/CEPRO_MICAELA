// Estilos de casillas comprobados en los libros institucionales, no en estilos sin uso.
function fieldStyle(templateId,key){const n=Number(templateId.slice(5));
 if([20,21].includes(n)&&key==='student.fullName')return {font:'CambriaBold',bold:true,maxFontSize:n===20?22:20,evidence:'Certificado D14 / título D14: Cambria en negrita, 22 / 20 nominales'};
 if(n===20&&key==='institution.name')return {font:'ArialBold',bold:true,maxFontSize:22,evidence:'Certificado C10: Arial 22 en negrita'};
 if(n===20&&key==='module.name')return {font:'Arial',bold:false,maxFontSize:14,evidence:'Certificado E16: Arial 14 regular'};
 if(n===20&&key==='program.name')return {font:'CambriaBold',bold:true,maxFontSize:11,evidence:'Certificado E18: Cambria 11 en negrita'};
 if(n===21&&key==='document.officialTitleText')return {font:'CambriaBold',bold:true,maxFontSize:14,evidence:'Título B17:D17: Cambria 14 en negrita'};
 if(n===1&&/^row\d+\.(nombre|sexo|fechaNacimiento|codigoMatricula|condicion)$/.test(key))return {font:'Calibri',bold:false,evidence:'Nómina: C15:J16, Calibri 10 regular'};
 if(n===3&&/^(student\.|birth\.|ordinal)/.test(key))return {font:'Arial',bold:false,evidence:'Registro: I6:M9, Arial regular'};
 if(n>=11&&n<=17&&/^(program\.name|period\.name|module\.name|curriculum\.)/.test(key))return {font:'CalibriLight',bold:true,syntheticBold:true,evidence:'Evaluación: C2:C11, Calibri Light 9 con negrita'};
 if(n>=11&&n<=17&&/^(eval\.|student\.\d+\.logro)/.test(key))return {font:'Arial',bold:false,evidence:'Evaluación: C16:AB16, Arial 9 regular'};
 if(n>=5&&n<=10&&/^mark\./.test(key))return {font:'Arial',bold:false,evidence:'Asistencia: D13 y casillas de marcas, Arial 8 regular'};
 if(n===18&&/^student\.\d+\.(crit\.|finalGrade)/.test(key))return {font:'Arial',bold:false,evidence:'EFSRT: F13:O14, Arial 7 regular'};
 return null;
}
function fontFiles(templateId){const n=Number(templateId.slice(5));return {Arial:'arial.ttf',ArialBold:'arialbd.ttf',...(n===1?{Calibri:'calibri.ttf'}:{}),...(n>=11&&n<=17?{CalibriLight:'calibril.ttf'}:{}),...([20,21].includes(n)?{CambriaBold:'cambriab.ttf'}:{})};}
function diagnosticText(text, options, context) {
  // 1. Marcadores técnicos de depuración que nunca deben aparecer en ningún documento
  if (/^(DEMO\s*[-—]\s*DATOS FICTICIOS|ACTA DE EVALUACIÓN MODULAR.*EMISIÓN ADMINISTRATIVA)/i.test(text)) return true;
  if (Number(options?.y) <= 50 && /^(ESTUDIANTES:\s*\d|Página\s+\d+\s+de\s+\d+\s*[·|-]\s*Registros|TOTAL GENERAL DEL GRUPO:|REGISTROS EN ESTA PÁGINA|Continuación\s+\d+\/\d+)/i.test(text)) return true;

  // 2. Documentos oficiales y finalizados: no deben mostrar advertencias de borrador ni demo (Requisito J)
  if (context?.isOfficial) {
    if (/^(BORRADOR|DEMOSTRACI[ÓO]N)/i.test(text)) return true;
  }

  // 3. Suprimir leyendas residuales con formato divergente de pdf-template-engine para que offline-pdf
  // dibuje de forma homogénea las marcas oficiales reglamentarias en todas las páginas sin solapamientos
  if (/^(BORRADOR ADMINISTRATIVO|DEMOSTRACI[ÓO]N\s*[-—]\s*NO OFICIAL)/i.test(text)) return true;

  return false;
}
module.exports={fieldStyle,fontFiles,diagnosticText};
