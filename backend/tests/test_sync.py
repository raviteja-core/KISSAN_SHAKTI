import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.services.sync_service import SyncService


client = TestClient(app)


def test_sync_push_accepts_queue_payload(monkeypatch):
    calls = []

    def fake_process(items):
        calls.append(items)
        return {"processed": len(items), "status": "ok"}

    monkeypatch.setattr('app.services.sync_service.SyncService.process_queue', fake_process)

    response = client.post('/api/v1/sync/push', json={"items": [{"action": "CREATE", "entity_type": "crops"}]})

    assert response.status_code == 200
    assert response.json()['processed'] == 1
    assert calls == [[{"action": "CREATE", "entity_type": "crops"}]]


def test_process_queue_normalizes_invalid_create_ids(monkeypatch):
    captured = {}

    class FakeInsertBuilder:
        def __init__(self, payload):
            self.payload = payload

        def execute(self):
            captured['payload'] = self.payload
            return type('Response', (), {'data': [self.payload]})()

    class FakeTable:
        def __init__(self, payload):
            self.payload = payload

        def insert(self, payload):
            return FakeInsertBuilder(payload)

    class FakeClient:
        def table(self, table_name):
            return FakeTable(table_name)

    monkeypatch.setattr('app.services.sync_service.supabase_client.get_client', lambda: FakeClient())

    result = SyncService.process_queue([
        {
            'action': 'CREATE',
            'entity_type': 'crops',
            'payload': {'id': 'live-write-check-001', 'name': 'Test Crop'}
        }
    ])

    assert result['processed'] == 1
    assert 'payload' in captured
    assert uuid.UUID(str(captured['payload']['id']))
