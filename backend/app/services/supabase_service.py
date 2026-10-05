from supabase import create_client, Client
from typing import Optional, List, Dict, Any
from app.config import settings

class SupabaseService:
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self._client: Optional[Client] = None

    @property
    def is_configured(self) -> bool:
        return bool(
            self.url 
            and "your-project-id" not in self.url 
            and self.key 
            and "your-supabase" not in self.key
        )

    def get_client(self) -> Client:
        if not self.is_configured:
            raise ValueError(
                "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY in your .env file."
            )
        if self._client is None:
            self._client = create_client(self.url, self.key)
        return self._client

    # Storage helpers
    async def list_files(self, bucket_name: Optional[str] = None, path: str = "") -> List[Dict[str, Any]]:
        client = self.get_client()
        bucket = bucket_name or self.bucket
        res = client.storage.from_(bucket).list(path)
        return res

    async def download_file(self, file_path: str, bucket_name: Optional[str] = None) -> bytes:
        client = self.get_client()
        bucket = bucket_name or self.bucket
        res = client.storage.from_(bucket).download(file_path)
        return res

    async def upload_file(self, file_path: str, file_bytes: bytes, content_type: str = "application/octet-stream", bucket_name: Optional[str] = None):
        client = self.get_client()
        bucket = bucket_name or self.bucket
        res = client.storage.from_(bucket).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        return res

    async def get_public_url(self, file_path: str, bucket_name: Optional[str] = None) -> str:
        client = self.get_client()
        bucket = bucket_name or self.bucket
        return client.storage.from_(bucket).get_public_url(file_path)

    # Database helpers
    async def fetch_table_rows(self, table: str, limit: int = 20) -> List[Dict[str, Any]]:
        client = self.get_client()
        response = client.table(table).select("*").limit(limit).execute()
        return response.data

    async def insert_table_row(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        client = self.get_client()
        response = client.table(table).insert(data).execute()
        return response.data[0] if response.data else {}

supabase_service = SupabaseService()
