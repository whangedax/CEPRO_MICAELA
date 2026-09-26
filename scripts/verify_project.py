from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
required = [
    '.agents/rules/00-core.md',
    '.agents/skills/cetpro-module/SKILL.md',
    'docs/PROJECT_STATE.md',
    'docs/ROADMAP.md',
    'sources/raw/BD.zip',
    'sources/raw/CARRERAS.jpeg',
    'sources/templates/CATALOGO_PLANTILLAS.md',
    'sources/templates/audit/AUDITORIA_REPLICAS.csv',
    'sources/templates/audit/LEEME_PRIMERO.txt',
]
missing = [p for p in required if not (ROOT / p).exists()]
print('ROOT:', ROOT)
if missing:
    print('FALTAN:')
    for p in missing:
        print('-', p)
    raise SystemExit(1)

xlsx = sorted((ROOT / 'sources/templates/originals/xlsx').glob('*.xlsx'))
png = sorted((ROOT / 'sources/templates/previews').glob('*.png'))
if len(xlsx) != 21 or len(png) != 21:
    raise SystemExit(f'Plantillas incompletas: XLSX={len(xlsx)} PNG={len(png)}')

print('Estructura minima: OK')
print('Plantillas XLSX:', len(xlsx))
print('Vistas PNG:', len(png))
for p in [
    'sources/raw/BD.zip',
    'sources/raw/CARRERAS.jpeg',
    'sources/legacy/PAQUETE_MAESTRO_CETPRO.zip',
]:
    f = ROOT / p
    print(hashlib.sha256(f.read_bytes()).hexdigest(), p)
