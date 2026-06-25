import os
from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str) -> str:
    value = os.getenv(name, "")
    if isinstance(value, str):
        return value.strip().strip('"\'')
    return ""


SUPABASE_URL = _get_env("SUPABASE_URL") or "https://nlndykqyumjmaalgywhw.supabase.co"
SUPABASE_ANON_KEY = _get_env("SUPABASE_ANON_KEY") or _get_env("anon_public")
SUPABASE_SERVICE_ROLE_KEY = _get_env("SUPABASE_SERVICE_ROLE_KEY") or _get_env("service_role")

APP_ENV = _get_env("APP_ENV") or "development"
