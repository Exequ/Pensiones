"""C3 de la Fase 1C: comprueba que siguen respondiendo 30 URLs de fuentes de /data (muestra repartida entre carpetas).

Escribe docs/comprobacion-urls.json y devuelve el resumen; verificacion_1c.py lo recoge en el informe. Ejecutar con `python3 -I`.
Una URL «responde» si devuelve 2xx o redirige a una página 2xx; 403/429 se anotan aparte (bloqueo de descargas automáticas, no caída).
"""
import collections, glob, json, os, random, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from comun import REPO, HOY

D = f'{REPO}/data'
N = 30


def urls():
    por = collections.defaultdict(set)
    for f in sorted(glob.glob(f'{D}/*/*.json')):
        carpeta = f.split('/')[-2]
        j = json.load(open(f, encoding='utf-8'))
        def anota(o):
            if isinstance(o, dict):
                u = o.get('url')
                if isinstance(u, str) and u.startswith('http') and 'source' not in o and 'title' in o:
                    por[carpeta].add(u)
                for v in o.values():
                    anota(v)
            elif isinstance(o, list):
                for v in o:
                    anota(v)
        anota(j)
    return por


def muestra(por):
    rnd = random.Random(2026)
    total = sum(len(v) for v in por.values())
    cuota = {c: min(4, len(v)) for c, v in por.items()}   # mínimo 4 por carpeta
    resto = N - sum(cuota.values())
    for c in sorted(por, key=lambda k: -len(por[k])):    # el resto, a las carpetas con más URLs
        extra = min(resto, max(0, round((N - 4 * len(por)) * len(por[c]) / total)), len(por[c]) - cuota[c])
        cuota[c] += extra
        resto -= extra
    out = []
    for c in sorted(por):
        out += [(c, u) for u in rnd.sample(sorted(por[c]), min(cuota[c], len(por[c])))]
    rnd.shuffle(out)
    return sorted(out[:N])


def prueba(url):
    r = subprocess.run(['curl', '-sS', '-L', '-m', '30', '-A', 'Mozilla/5.0', '-o', '/dev/null', '-w', '%{http_code} %{url_effective}', url], capture_output=True, text=True)
    cod = r.stdout.split(' ')[0] if r.stdout else '000'
    return cod, (r.stderr.strip()[:120] if r.returncode else '')


def main():
    por = urls()
    print({c: len(v) for c, v in por.items()})
    res = []
    for c, u in muestra(por):
        cod, err = prueba(u)
        estado = 'responde' if cod.startswith('2') else ('bloqueada' if cod in ('403', '429', '401') else 'no responde')
        res.append({'carpeta': c, 'url': u, 'http': cod, 'estado': estado, 'error': err})
        print(estado, cod, c, u[:90])
    json.dump({'fecha': HOY, 'muestra': len(res), 'resultados': res}, open(f'{REPO}/docs/comprobacion-urls.json', 'w'), ensure_ascii=False, indent=1)
    print(collections.Counter(r['estado'] for r in res))


if __name__ == '__main__':
    main()
