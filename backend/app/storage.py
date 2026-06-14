import io
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

# Enable HEIC/HEIF support (iPhone photos) if pillow-heif is installed.
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:  # pragma: no cover - optional dependency
    pass

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Hard cap on the raw upload we'll even read into memory (before re-compression).
MAX_RAW_BYTES = 25 * 1024 * 1024  # 25 MB
# Uploaded images are normalised to JPEG, downscaled to fit this box.
MAX_DIMENSION = 1600
JPEG_QUALITY = 85

# Defense-in-depth allowlist (the real protection is re-decoding/re-encoding below).
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def save_upload(file: UploadFile) -> str:
    """Normalise any image (incl. HEIC) to a web-friendly JPEG and store it.

    Returns the relative path, e.g. 'uploads/xyz.jpg'. We accept essentially any
    image the server can decode, then convert/resize so it always displays in a
    browser and stays under a reasonable size — so users never have to fight with
    file formats from their phone.
    """
    # Cheap allowlist checks first (the decode/re-encode below is the real guard).
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file extension")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are allowed")

    data = file.file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(data) > MAX_RAW_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image is too large (max 25 MB). Please send a smaller photo.",
        )

    try:
        image = Image.open(io.BytesIO(data))
        # Respect EXIF orientation (phones rotate via metadata, not pixels).
        image = ImageOps.exif_transpose(image)
        # Flatten transparency onto white so JPEG output looks right.
        if image.mode in ("RGBA", "LA", "P"):
            image = image.convert("RGBA")
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        else:
            image = image.convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That file isn't a readable image. Try a photo (JPEG, PNG, HEIC…).",
        )

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))

    filename = f"{uuid.uuid4().hex}.jpg"
    dest = UPLOAD_DIR / filename
    image.save(dest, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return f"uploads/{filename}"


def delete_file(relative_path: str) -> None:
    """Best-effort removal of a stored file; ignores missing files."""
    try:
        Path(relative_path).unlink()
    except OSError:
        pass
