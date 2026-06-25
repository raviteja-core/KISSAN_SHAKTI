from typing import Any, Dict, List

from app.core.db import supabase_client


class SupabaseStore:
    @staticmethod
    def client():
        try:
            return supabase_client.get_client()
        except Exception:
            return None

    @staticmethod
    def list(table: str, fallback: List[Dict[str, Any]]):
        client = SupabaseStore.client()
        if not client:
            return fallback

        try:
            response = client.table(table).select('*').order('created_at', desc=True).execute()
            return response.data if response.data is not None else fallback
        except Exception:
            return fallback

    @staticmethod
    def create(table: str, payload: Dict[str, Any], fallback: Dict[str, Any]):
        client = SupabaseStore.client()
        if not client:
            return fallback

        try:
            response = client.table(table).insert(payload).execute()
            return (response.data or [fallback])[0]
        except Exception:
            return fallback

    @staticmethod
    def delete(table: str, record_id: str):
        client = SupabaseStore.client()
        if not client:
            return False

        try:
            response = client.table(table).delete().eq('id', record_id).execute()
            return bool(response.data)
        except Exception:
            return False

    @staticmethod
    def update(table: str, record_id: str, payload: Dict[str, Any]):
        client = SupabaseStore.client()
        if not client:
            return None

        try:
            response = client.table(table).update(payload).eq('id', record_id).execute()
            return (response.data or [None])[0]
        except Exception:
            return None
