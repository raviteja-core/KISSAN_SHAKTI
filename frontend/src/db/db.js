import Dexie from 'dexie';

// Initialize the Dexie database
export const db = new Dexie('KissanShakthiDB');

db.version(1).stores({
  crops: 'id, name, category, status, created_at',
  workers: 'id, name, phone, status, created_at',
  jobs: 'id, worker_id, title, status, created_at',
  sync_queue: '++id, action, entity_type, entity_id, created_at',
  sync_logs: '++id, status, created_at'
});
