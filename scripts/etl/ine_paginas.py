"""Descarga las páginas de metodología de INEbase (HTML) usadas como fuente de definiciones.

Guarda data-raw/ine/paginas/<clave>.html y registra URL, fecha y SHA-256 en
data-raw/ine/paginas/origen.json. Con MODO=local no descarga. Ejecutar con `python3 -I`.
"""
import hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

DIR = f'{REPO}/data-raw/ine/paginas'
BASE = 'https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid={cid}&menu={menu}&idp={idp}'
# clave: (cid, idp)
OPERACIONES = {
    'ecp': ('1254736177095', '1254735572981'),
    'tablas-mortalidad': ('1254736177004', '1254735573002'),
    'migraciones-emcr': ('1254736177098', '1254735573002'),
    'proyecciones-poblacion': ('1254736176953', '1254735572981'),
    'epa': ('1254736176918', '1254735976595'),
    'eaes': ('1254736177025', '1254735976596'),
    'etcl': ('1254736045053', '1254735976596'),
    'idb': ('1254736177003', '1254735573002'),
    'cna': ('1254736177057', '1254735576581'),
}
MENUS = ('metodologia', 'resultados')


def texto(clave, menu='metodologia'):
    t = open(f'{DIR}/{clave}-{menu}.html', encoding='utf-8', errors='replace').read()
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S)
    import html
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t)))


def main():
    os.makedirs(DIR, exist_ok=True)
    ruta_o = f'{DIR}/origen.json'
    origen = json.load(open(ruta_o)) if os.path.exists(ruta_o) else {}
    for clave, (cid, idp) in OPERACIONES.items():
        for menu in MENUS:
            f = f'{DIR}/{clave}-{menu}.html'
            if not os.path.exists(f) and os.environ.get('MODO') != 'local':
                url = BASE.format(cid=cid, menu=menu, idp=idp)
                crudo = subprocess.run(['curl', '-sS', '-L', '-m', '60', url], capture_output=True).stdout
                open(f, 'wb').write(crudo)
                origen[f'{clave}-{menu}'] = {'url': url, 'fetchedAt': HOY,
                                             'sha256': hashlib.sha256(crudo).hexdigest()}
            print(clave, menu, os.path.getsize(f))
    json.dump(origen, open(ruta_o, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
