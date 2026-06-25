import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uuid

from supabase import create_client

from app.core.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY


def main():
    if not SUPABASE_URL:
        raise RuntimeError('SUPABASE_URL is not configured')

    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    if not key:
        raise RuntimeError('Supabase key is not configured')

    client = create_client(SUPABASE_URL, key)

    farmer_id = 'e3cb89cf-4a3b-4861-84bb-7313a0c5c3fb'
    worker_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'test-worker-001'))
    crop_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'test-crop-001'))
    job_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'test-job-001'))
    profile_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 'test-profile-001'))
    now = datetime.now(timezone.utc).isoformat()

    profile = {
        'id': profile_id,
        'full_name': 'Live Sync Test Farmer',
        'phone': '+91 99999 00001',
        'role': 'farmer',
        'state': 'Maharashtra',
        'created_at': now,
        'updated_at': now,
    }

    crop = {
        'id': crop_id,
        'farmer_id': farmer_id,
        'name': 'Live Sync Test Crop',
        'category': 'grain',
        'quantity_kg': 42.5,
        'price_per_kg': 48,
        'status': 'available',
        'harvest_date': '2026-06-20',
        'created_at': now,
        'updated_at': now,
        'sync_status': 'pending_create',
    }

    worker = {
        'id': worker_id,
        'farmer_id': farmer_id,
        'name': 'Live Sync Test Worker',
        'phone': '+91 90000 00001',
        'state': 'Maharashtra',
        'skills': ['Harvesting', 'Sowing'],
        'daily_rate': 500,
        'status': 'active',
        'created_at': now,
        'updated_at': now,
        'sync_status': 'pending_create',
    }

    job = {
        'id': job_id,
        'farmer_id': farmer_id,
        'worker_id': worker_id,
        'title': 'Live Sync Test Job',
        'description': 'Inserted by the verification script to confirm backend + Supabase sync.',
        'location': 'Pimplad Village',
        'payment': 1750,
        'required_skill': 'Harvesting',
        'status': 'assigned',
        'created_at': now,
        'updated_at': now,
        'sync_status': 'pending_create',
    }

    sync_queue = {
        'action': 'CREATE',
        'entity_type': 'crops',
        'entity_id': crop_id,
        'payload': crop,
        'status': 'pending',
        'created_at': now,
    }

    sync_log = {
        'status': 'SUCCESS',
        'message': 'Verification insertion executed from backend/scripts/test_insert_all_tables.py',
        'records_count': 6,
        'created_at': now,
    }

    inserts = [
        ('profiles', [profile], 'id'),
        ('crops', [crop], 'id'),
        ('workers', [worker], 'id'),
        ('jobs', [job], 'id'),
        ('sync_queue', [sync_queue], None),
        ('sync_logs', [sync_log], None),
    ]

    results = {}
    for table_name, rows, conflict_col in inserts:
        if conflict_col:
            response = client.table(table_name).upsert(rows, on_conflict=conflict_col).execute()
        else:
            response = client.table(table_name).insert(rows).execute()

        results[table_name] = {
            'count': len(response.data or []),
            'data': response.data,
        }

    print('INSERTION_RESULTS')
    for table_name, result in results.items():
        print(f'- {table_name}: inserted={result["count"]}')

    print('\nSUMMARY')
    print('Profiles/Crops/Workers/Jobs rows should now exist in Supabase.')
    print('Use the frontend sync screen or the backend sync endpoint to confirm the live path works.')


if __name__ == '__main__':
    main()
