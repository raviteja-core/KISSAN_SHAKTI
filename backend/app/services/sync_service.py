import uuid
from typing import Dict, Any

from app.core.db import supabase_client


class SyncService:
    @staticmethod
    def _normalize_uuid(value: Any) -> str:
        if value is None:
            return str(uuid.uuid4())

        if isinstance(value, uuid.UUID):
            return str(value)

        text = str(value).strip()
        if not text:
            return str(uuid.uuid4())

        try:
            return str(uuid.UUID(text))
        except ValueError:
            return str(uuid.uuid5(uuid.NAMESPACE_URL, text))

    @staticmethod
    def _normalize_payload(entity_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(payload)

        # Handle ID normalization
        if 'id' in normalized:
            normalized['id'] = SyncService._normalize_uuid(normalized['id'])

        # Normalize crops format
        if entity_type == 'crops':
            if 'farmer_id' in normalized and normalized.get('farmer_id'):
                normalized['farmer_id'] = SyncService._normalize_uuid(normalized['farmer_id'])
            # Ensure quantity_kg and price_per_kg are floats
            if 'quantity_kg' in normalized:
                normalized['quantity_kg'] = float(normalized['quantity_kg'])
            if 'price_per_kg' in normalized:
                normalized['price_per_kg'] = float(normalized['price_per_kg'])

        # Normalize jobs format
        if entity_type == 'jobs':
            if 'farmer_id' in normalized and normalized.get('farmer_id'):
                normalized['farmer_id'] = SyncService._normalize_uuid(normalized['farmer_id'])
            else:
                normalized['farmer_id'] = 'user_farmer_ramesh' # default

            # Map worker_id to laborer_id
            if 'worker_id' in normalized:
                val = normalized.pop('worker_id')
                if val:
                    normalized['laborer_id'] = SyncService._normalize_uuid(val)
                else:
                    normalized['laborer_id'] = None
            elif 'laborer_id' in normalized and normalized.get('laborer_id'):
                normalized['laborer_id'] = SyncService._normalize_uuid(normalized['laborer_id'])

            # Map payment to daily_wage
            if 'payment' in normalized:
                normalized['daily_wage'] = float(normalized.pop('payment'))
            elif 'daily_wage' in normalized:
                normalized['daily_wage'] = float(normalized['daily_wage'])

            # Remove local-only fields
            if 'sync_status' in normalized:
                del normalized['sync_status']
            if 'applicants' in normalized:
                del normalized['applicants']

        # Normalize workers format
        if entity_type == 'workers':
            if 'daily_rate' in normalized:
                normalized['daily_rate'] = float(normalized['daily_rate'])

        return normalized

    @staticmethod
    def process_queue(items: list[dict]) -> Dict[str, Any]:
        client = supabase_client.get_client()
        processed = 0

        for item in items:
            entity_type = item.get('entity_type')
            if not entity_type:
                continue
            
            # Map frontend types if needed
            entity_type = entity_type.lower()
            payload = SyncService._normalize_payload(entity_type, item.get('payload', {}))
            action = item.get('action', 'CREATE').upper()

            if entity_type not in ('crops', 'workers', 'jobs'):
                continue

            if action == 'DELETE':
                record_id = payload.get('id') or item.get('entity_id')
                if entity_type == 'crops':
                    record_id = SyncService._normalize_uuid(record_id)
                if record_id:
                    client.table(entity_type).delete().eq('id', record_id).execute()
                    processed += 1
                continue

            if action in ('CREATE', 'UPDATE'):
                record_id = payload.get('id') or item.get('entity_id')
                if entity_type == 'crops':
                    record_id = SyncService._normalize_uuid(record_id)
                    payload['id'] = record_id
                
                if action == 'UPDATE' and record_id:
                    client.table(entity_type).update(payload).eq('id', record_id).execute()
                else:
                    if 'id' not in payload:
                        payload['id'] = record_id
                    client.table(entity_type).insert(payload).execute()
                processed += 1

        return {"processed": processed, "status": "ok"}

    @staticmethod
    def summarize_sync(payload: Dict[str, Any]) -> Dict[str, Any]:
        result = SyncService.process_queue(payload.get('items', []))
        return {
            "received": True,
            "records": len(payload.get('items', [])),
            "status": result.get('status', 'ok'),
            "processed": result.get('processed', 0),
            "message": "Sync payload processed by Supabase backend."
        }
