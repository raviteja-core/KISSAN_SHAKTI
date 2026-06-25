from supabase import create_client, Client

from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY


class SupabaseClient:
    def __init__(self):
        self.client: Client | None = None
        key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
        if SUPABASE_URL and key:
            self.client = create_client(SUPABASE_URL, key)

    def get_client(self) -> Client:
        if self.client is None:
            raise RuntimeError("Supabase client is not configured. Set SUPABASE_URL and a valid key.")
        return self.client


supabase_client = SupabaseClient()
