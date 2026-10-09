export function unitGuide(data,active){
 if(data.user.role!=='DOCENTE'||data.workspace?.mode!=='UNIT')return '';
 const steps=[['configuracion-documental','Preparar','Nombre, capacidad y cinco indicadores'],['asistencia','Asistencia','Registrar cada sesión de clase'],['evaluacion','Evaluación','Instrumentos, indicadores y resultado'],['documentos','Revisar formatos','Comprobar el PDF antes de entregar'],['entregas','Entregas','Consultar la recepción y sincronizar']];
 return `<nav class="unit-guide" aria-label="Pasos de trabajo de la unidad">${steps.map(([route,title,description],i)=>`<a href="#/${route}"${active===route?' aria-current="step"':''}><span>${i+1}</span><div><strong>${title}</strong><small>${description}</small></div></a>`).join('')}</nav>`;
}
