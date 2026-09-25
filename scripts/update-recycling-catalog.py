"""Actualiza la copia oficial que viaja con EcoQuest. Requiere: pip install pyproj."""
import csv
import hashlib
import io
import json
import re
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from pyproj import CRS, Transformer

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cdn.buenosaires.gob.ar/datosabiertos/datasets/ministerio-de-espacio-publico-e-higiene-urbana/infraestructura-gestion-residuos/"
CSV_URL = BASE + "contenedores_verdes_clean.csv"
SHP_URL = BASE + "Contenedores_Verdes_clean.zip"

def download(url):
    with urllib.request.urlopen(url, timeout=40) as response:
        return response.read()

archive = zipfile.ZipFile(io.BytesIO(download(SHP_URL)))
projection = archive.read(next(n for n in archive.namelist() if n.endswith('.prj'))).decode()
transform = Transformer.from_crs(CRS.from_wkt(projection), 'EPSG:4326', always_xy=True)
points = []
for row in csv.DictReader(io.StringIO(download(CSV_URL).decode('utf-8-sig'))):
    x, y = map(float, re.fullmatch(r'Point\s*\(([^()]+)\)', row['wkt_geom']).group(1).split())
    lng, lat = transform.transform(x, y)
    if not (-58.6 < lng < -58.3 and -34.75 < lat < -34.5):
        raise ValueError('Coordenadas fuera de CABA; revisar la proyección oficial')
    address = row['direccion']
    identity = f'{address}|{lat:.6f}|{lng:.6f}'
    points.append(dict(id='badata-verde-' + hashlib.sha256(identity.encode()).hexdigest()[:16],
        name='Contenedor verde - ' + address, address=address, lat=round(lat, 7), lng=round(lng, 7),
        acceptedContainers=['Contenedor verde', 'Vidrio'], containerColor='verde', type='StreetContainerPoint'))

sources = [CSV_URL, SHP_URL]
for category, color, accepted in [
    ('contenedores_negros', 'negro', ['Basura comun']),
    ('puntos_verdes', 'verde', ['Contenedor verde', 'Vidrio', 'Punto especial', 'Pilas/baterias', 'RAEE/electronicos'])
]:
    url = f'https://epok.buenosaires.gob.ar/getGeoLayer/?categoria={category}&formato=geojson&srid=4326'
    sources.append(url)
    for feature in json.loads(download(url))['features']:
        props = feature['properties']
        lng, lat = feature['geometry']['coordinates'][:2]
        address = props.get('Nombre') or props.get('DireccionNormalizada') or category
        special = category == 'puntos_verdes'
        points.append(dict(id=props['Id'], name=('Punto verde - ' if special else 'Contenedor negro - ') + address,
            address=address, lat=lat, lng=lng, acceptedContainers=accepted, containerColor=color,
            type='SpecialGreenPoint' if special else 'StreetContainerPoint', specialty='Punto especial' if special else None))

assert len(points) > 4000 and len({p['id'] for p in points}) == len(points)
output = ROOT / 'Frontend/data/recycling-points.json'
output.write_text(json.dumps(dict(updatedAt=datetime.now(timezone.utc).date().isoformat(),
    attribution='Gobierno de la Ciudad de Buenos Aires / BA Data (CC BY)', sources=sources,
    coverage='CABA. Contenedores verdes: archivo completo BA Data; negros y puntos con atención: capa EPOK disponible.',
    points=points), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(points)} puntos oficiales guardados en {output}')
