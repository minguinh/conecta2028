"""Prepare public TSE aggregates for Xexeu. No database access or automatic upload."""
import argparse
import csv
import hashlib
import io
import json
import math
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def municipal_rows(archive):
    with zipfile.ZipFile(archive) as z:
        files = [n for n in z.namelist() if n.lower().endswith('.csv')]
        if len(files) != 1:
            raise ValueError('Expected exactly one CSV in the official archive')
        with io.TextIOWrapper(z.open(files[0]), encoding='cp1252') as stream:
            reader = csv.DictReader(stream, delimiter=';')
            rows = [r for r in reader if r.get('SG_UF') == 'PE' and r.get('CD_MUNICIPIO') == '23060']
            fields = reader.fieldnames
    if not rows:
        raise ValueError('No Xexeu records found')
    for row in rows:
        name = unicodedata.normalize('NFKD', row['NM_MUNICIPIO']).encode('ascii', 'ignore').decode().upper()
        if name != 'XEXEU':
            raise ValueError('Municipality code/name mismatch')
    return fields, rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--year', type=int, choices=[2016, 2020, 2024], required=True)
    parser.add_argument('--results-zip', type=Path, required=True)
    parser.add_argument('--places-zip', type=Path, help='Optional official geography archive for the same year')
    parser.add_argument('--output', type=Path, default=Path('.cloudflare-artifacts/tse-xexeu'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    fields, rows = municipal_rows(args.results_zip)
    if any(int(r['ANO_ELEICAO']) != args.year for r in rows):
        raise ValueError('Unexpected election year')
    csv_path = args.output / f'xexeu-{args.year}.csv'
    with csv_path.open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';', quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    if len(rows) > 2000 or csv_path.stat().st_size > 1_500_000:
        raise ValueError('Municipality excerpt exceeds the application batch limit')
    expected_places = {(int(r['NR_ZONA']), str(int(r['NR_LOCAL_VOTACAO']))) for r in rows}
    _, location_rows = municipal_rows(args.places_zip) if args.places_zip else ([], [])
    points = {}
    for r in location_rows:
        if int(r['AA_ELEICAO']) != args.year:
            raise ValueError('Unexpected geography year')
        key = (int(r['NR_ZONA']), str(int(r['NR_LOCAL_VOTACAO'])))
        if key not in expected_places:
            continue
        latitude = float(r['NR_LATITUDE'].replace(',', '.'))
        longitude = float(r['NR_LONGITUDE'].replace(',', '.'))
        if not (math.isfinite(latitude) and math.isfinite(longitude) and -90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise ValueError('Official coordinates missing or invalid; do not guess a location')
        coordinates = [longitude, latitude]
        if key in points and points[key]['geometry']['coordinates'] != coordinates:
            raise ValueError('Conflicting coordinates for the same official polling place')
        points[key] = {'type': 'Feature', 'properties': {'year': args.year, 'uf': 'PE', 'municipality': '23060', 'zone': key[0], 'place': key[1]}, 'geometry': {'type': 'Point', 'coordinates': coordinates}}
    if args.places_zip and set(points) != expected_places:
        raise ValueError('Some polling places have no corresponding official coordinates')
    geo_path = args.output / f'xexeu-locais-{args.year}.geojson'
    if args.places_zip:
        geo_path.write_text(json.dumps({'type': 'FeatureCollection', 'features': list(points.values())}, ensure_ascii=False), encoding='utf-8')
    totals = defaultdict(lambda: {'rows': 0, 'votes': 0, 'sections': set(), 'places': set()})
    for row in rows:
        key = (row['CD_ELEICAO'], row['NR_TURNO'], row['CD_CARGO'], row['DS_CARGO'])
        t = totals[key]
        t['rows'] += 1
        t['votes'] += int(row['QT_VOTOS'])
        t['sections'].add((row['NR_ZONA'], row['NR_SECAO']))
        t['places'].add((row['NR_ZONA'], row['NR_LOCAL_VOTACAO']))
    manifest = {'preparedAt': datetime.now(timezone.utc).isoformat(), 'year': args.year, 'uf': 'PE', 'municipalityTse': '23060', 'municipality': 'Xexéu', 'resultRows': len(rows), 'pollingPlaces': len(expected_places), 'geocodedPlaces': len(points), 'sources': {'results': f'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_{args.year}_PE.zip', 'places': f'https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_{args.year}.zip' if args.places_zip else None}, 'sha256': {'resultsArchive': sha256(args.results_zip), 'placesArchive': sha256(args.places_zip) if args.places_zip else None, 'csv': sha256(csv_path), 'geojson': sha256(geo_path) if args.places_zip else None}, 'sourceGenerationDates': sorted({r['DT_GERACAO'] for r in rows}), 'totals': [{'election': k[0], 'turn': int(k[1]), 'office': k[2], 'officeName': k[3], 'rows': v['rows'], 'votesIncludingBlankAndNull': v['votes'], 'sections': len(v['sections']), 'places': len(v['places'])} for k, v in sorted(totals.items())]}
    (args.output / f'manifest-{args.year}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'year': args.year, 'rows': len(rows), 'pollingPlaces': len(expected_places), 'geocodedPlaces': len(points), 'output': str(args.output)}))


if __name__ == '__main__':
    main()
