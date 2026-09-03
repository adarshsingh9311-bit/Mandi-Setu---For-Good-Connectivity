"""Export a consistent farmer-data snapshot without credentials or staff records."""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from .database import connection, DEMO_FARMER_ID


def export(destination: Path, excluded_usernames=()):
    database_url = os.environ.get('DATABASE_URL')
    database = Path(os.environ.get('KISANSETU_DB_PATH', Path(__file__).resolve().parents[1] / 'data' / 'kisansetu.sqlite3'))
    if not database_url and not database.is_file():
        raise FileNotFoundError('No existing backend database. Start the backend before exporting.')
    with connection() as db:
        db.execute('BEGIN')
        farmers = db.execute("SELECT f.id,f.payload,a.username FROM farmers f LEFT JOIN accounts a ON a.id=f.id WHERE a.role='farmer' OR a.id IS NULL").fetchall()
        farmers = [r for r in farmers if r['username'] not in excluded_usernames]
        ids = {r['id'] for r in farmers}
        payload = {'farmers': [dict(json.loads(r['payload']), id=r['id']) for r in farmers]}
        crops = db.execute('SELECT id,farmer_id,payload FROM crops').fetchall()
        payload['crops'] = [dict(json.loads(r['payload']), id=r['id'], farmerId=r['farmer_id']) for r in crops if r['farmer_id'] in ids]
        for table in ('bookings', 'queue_tokens', 'visits', 'notifications', 'delay_reports'):
            payload[table] = [dict(r) for r in db.execute(f'SELECT * FROM {table}').fetchall() if r['farmer_id'] in ids]
        for report in payload['delay_reports']:
            for field in ('booking', 'resolution'):
                if report[field]:
                    report[field] = json.loads(report[field])
    metadata = {
        'formatVersion': 1,
        'exportedAt': datetime.now(timezone.utc).isoformat(),
        'counts': {name: len(rows) for name, rows in payload.items()},
        'seededDemoFarmerIds': [DEMO_FARMER_ID] if DEMO_FARMER_ID in ids else [],
        'excluded': ['staff profiles', 'account credentials', 'password hashes', 'sessions', 'login attempts', 'specified test accounts'],
        'note': 'JSON data snapshot, not an authenticated database restore. Demo seed records are explicitly identified.',
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, 'x', compression=ZIP_DEFLATED) as archive:
        for name, rows in {**payload, 'manifest': metadata}.items():
            archive.writestr(name + '.json', json.dumps(rows, indent=2, ensure_ascii=False))
        archive.writestr('README.txt',
            'MandiSetu farmer backend data\n\n'
            'Each JSON file contains records from one domain. The manifest lists counts, export time and demo seed IDs.\n'
            'Farmer profiles include their stored contact details. Keep this local data archive private.\n'
            'Passwords, account usernames, authentication sessions and staff profiles are excluded.\n'
            'This is a data export; it does not include backend source code, login accounts or an automated restore tool.\n'
            'An empty array means no matching records existed at export time.\n')
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path, help='New .zip path (existing files are never overwritten)')
    parser.add_argument('--exclude-username', action='append', default=[])
    args = parser.parse_args()
    result = export(args.destination, args.exclude_username)
    print(json.dumps({'file': str(args.destination.resolve()), **result}, indent=2))


if __name__ == '__main__':
    main()
