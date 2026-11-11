"""Rastreo del portal de Información Económico Financiera de la Seguridad Social.

Localiza, para cada ejercicio, los ficheros de la liquidación del presupuesto (página 396) y de
la ejecución mensual (página 394). Modo `descargar` (por defecto) o `local` (solo lee
data-raw/seg-social-fin/). Escribe data-raw/seg-social-fin/indice.json. `python3 -I`."""
import html, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO

RAW = f'{REPO}/data-raw/seg-social-fin'
BASE = 'https://www.seg-social.es'
RAIZ = f'{BASE}/wps/portal/wss/internet/InformacionEconomicoFinanciera/393'
MODO = os.environ.get('MODO', 'descargar')
SECCIONES = {'liquidacion': '396', 'ejecucion': '394'}


def pagina(url, nombre):
    f = f'{RAW}/paginas/{nombre}.html'
    if MODO == 'descargar' and not os.path.exists(f):
        subprocess.run(['curl', '-sSL', '--max-time', '60', '-o', f, url if url.startswith('http') else BASE + url], check=True)
    return html.unescape(open(f, encoding='utf-8', errors='ignore').read())


def enlaces(t):
    for m in re.finditer(r'href="([^"]+)"[^>]*>(.*?)</a>', t, re.S):
        yield m.group(1), re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(2))).strip()


def ficheros(t):
    out = {}
    for h, tx in enlaces(t):
        if re.search(r'\.(xlsx?|pdf)(\?|$)', h, re.I) and not h.lower().split('?')[0].endswith('.pdf'):
            u = (h if h.startswith('http') else BASE + h).split('?')[0]
            out[u.split('/')[-1]] = {'url': u, 'texto': tx}
    return out


def main():
    os.makedirs(f'{RAW}/paginas', exist_ok=True)
    indice = {}
    for sec, cod in SECCIONES.items():
        raiz = pagina(f'{RAIZ}/{cod}', f'{sec}')
        anios = {}
        for h, tx in enlaces(raiz):
            m = re.search(r'(?:Ejercicio|Financial Year|Year)\s+(\d{4})|(\d{4})(?: Financial Year)?$', tx)
            if m and f'/393/{cod}/' in h:
                anios[int(m.group(1) or m.group(2))] = h.split('/!ut')[0]
        for a, h in sorted(anios.items()):
            t = pagina(h, f'{sec}_{a}')
            if sec == 'ejecucion':  # una página por mes
                for h2, tx2 in enlaces(t):
                    if tx2 in ('Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre') and f'/393/{cod}/' in h2:
                        mes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].index(tx2) + 1
                        f = ficheros(pagina(h2.split('/!ut')[0], f'{sec}_{a}_{mes:02d}'))
                        if f:
                            indice.setdefault(sec, {}).setdefault(str(a), {})[f'{mes:02d}'] = f
            else:
                f = ficheros(t)
                if f:
                    indice.setdefault(sec, {})[str(a)] = f
    json.dump(indice, open(f'{RAW}/indice.json', 'w'), indent=1, ensure_ascii=False)
    for sec in indice:
        print(sec, {a: (len(v) if sec == 'liquidacion' else sorted(v)) for a, v in indice[sec].items()})


if __name__ == '__main__':
    main()
