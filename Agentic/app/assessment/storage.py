"""Private Supabase bucket only; never fetch student URLs or local files."""
import io
from urllib.parse import urlsplit, quote
import httpx
from PIL import Image
from app.config import settings
from app.assessment.content import Media

class MediaError(ValueError): pass

class Storage:
    def __init__(self, config=settings, transport=None):
        self.config, self.transport = config, transport

    def read(self, record):
        m = Media.model_validate(record)
        cfg = self.config
        parsed = urlsplit(cfg.SUPABASE_URL)
        if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.supabase.co') or parsed.username or parsed.port not in (None, 443):
            raise MediaError('Configure a trusted Supabase HTTPS origin')
        if not cfg.SUPABASE_KEY or 'your-' in cfg.SUPABASE_KEY:
            raise MediaError('Private storage credentials missing')
        origin = f'https://{parsed.hostname}'
        bucket = quote(cfg.ASSESSMENT_STORAGE_BUCKET, safe='')
        with httpx.Client(timeout=15, follow_redirects=False, transport=self.transport) as client:
            # Verify privacy rather than inheriting the template public bucket.
            info = client.get(f'{origin}/storage/v1/bucket/{bucket}', headers={'Authorization': f'Bearer {cfg.SUPABASE_KEY}', 'apikey': cfg.SUPABASE_KEY})
            if info.status_code != 200 or info.json().get('public') is not False:
                raise MediaError('Assessment bucket must exist and be private')
            with client.stream('GET', f'{origin}/storage/v1/object/authenticated/{bucket}/{quote(m.object_key, safe="/")}', headers={'Authorization': f'Bearer {cfg.SUPABASE_KEY}', 'apikey': cfg.SUPABASE_KEY}) as response:
                if response.status_code != 200: raise MediaError('Approved media unavailable')
                if response.headers.get('content-type', '').split(';')[0] != m.mime_type: raise MediaError('Image MIME mismatch')
                raw = bytearray()
                for chunk in response.iter_bytes():
                    raw.extend(chunk)
                    if len(raw) > cfg.MEDIA_MAX_BYTES: raise MediaError('Image too large')
        try:
            with Image.open(io.BytesIO(raw)) as img:
                if img.width * img.height > cfg.MEDIA_MAX_PIXELS or Image.MIME.get(img.format) != m.mime_type: raise MediaError('Invalid image size or format')
                img.verify()
        except (OSError, Image.DecompressionBombError):
            raise MediaError('Invalid image') from None
        return bytes(raw)
