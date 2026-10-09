from pathlib import Path
import zipfile,xml.etree.ElementTree as E,json,collections
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
out=Path('tests/offline-artifacts/typography');out.mkdir(parents=True,exist_ok=True)
report=[]
for p in sorted(Path('sources/templates/originals/xlsx').glob('*.xlsx')):
 z=zipfile.ZipFile(p);st=E.fromstring(z.read('xl/styles.xml'));fonts=list(st.find('s:fonts',ns));xf=list(st.find('s:cellXfs',ns))
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(t.itertext()) for t in E.fromstring(z.read('xl/sharedStrings.xml'))]
 cells=[]
 for c in E.fromstring(z.read(next(n for n in z.namelist() if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')))).findall('.//s:c',ns):
  f=fonts[int(xf[int(c.get('s',0))].get('fontId',0))];v=c.find('s:v',ns);text=v.text if v is not None else ''
  if c.get('t')=='s' and text:text=strings[int(text)]
  cells.append({'cell':c.get('r'),'text':text,'font':f.find('s:name',ns).get('val'),'size':float(f.find('s:sz',ns).get('val')),'bold':f.find('s:b',ns) is not None})
 count=collections.Counter((c['font'],c['size'],c['bold']) for c in cells)
 report.append({'source':str(p),'cells':cells});print(p.name, count.most_common(3))
(out/'SOURCE_STYLES.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
