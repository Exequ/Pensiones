"""Descarga (modo `descargar`) o localiza (modo `local`) los ficheros REG de diciembre de cada
año: número y pensión media por clase, sexo y régimen (Seguridad Social). Usa indice.json
generado por ss_rastreo.py. Guarda en data-raw/seg-social/REG/AAAA.xlsx y su hash."""
import hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO
RAW = f'{REPO}/data-raw/seg-social'
MODO = os.environ.get('MODO', 'descargar')
PAT = os.environ.get('PREFIJO', 'REG')

def mes_anio(n, a):
    for m in (re.fullmatch(PAT + r'3?(\d{4})(\d{2})\.xlsx', n), re.fullmatch(PAT + r'3?(\d{2})(\d{4})\.xlsx', n)):
        if m:
            x, y = int(m.group(1)), int(m.group(2))
            if x == a: return x, y
            if y == a: return y, x
    return None

def main():
    ix = json.load(open(f'{RAW}/indice.json'))
    sal = {}
    os.makedirs(f'{RAW}/{PAT}', exist_ok=True)
    for a, fs in ix.items():
        for n, v in fs.items():
            r = mes_anio(n, int(a))
            if r and r[1] == 12 and r[0] == int(a):
                f = f'{RAW}/{PAT}/{a}.xlsx'
                if MODO == 'descargar' and not os.path.exists(f):
                    subprocess.run(['curl', '-sS', '--max-time', '90', '-o', f, v['url'] + '?MOD=AJPERES&CONVERT_TO=linktext'], check=True)
                sal[a] = {'url': v['url'], 'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest()}
    json.dump(sal, open(f'{RAW}/{PAT}/origen.json', 'w'), indent=1)
    print(sorted(sal))
main()
