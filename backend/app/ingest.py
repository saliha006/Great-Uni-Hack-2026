import io
import re

from pydantic import BaseModel
from pypdf import PdfReader

TARGET_WORDS = 300  # TUNE
MAX_BLOCK_WORDS = 450  # TUNE
MIN_CHUNKS = 3
# About 60k words bounds DB rows per paste; the API already rejects bodies over 1 MB.
MAX_CHUNKS = 200


class ChunkDraft(BaseModel):
    idx: int
    text: str
    difficulty_est: float


def extract_text(pdf_bytes: bytes) -> str:
    text = "\n\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(pdf_bytes)).pages)
    if not text.strip():
        raise ValueError("No extractable text; paste the text instead")
    return text


def _difficulty(text: str) -> float:
    words = re.findall(r"[^\W\d_]+", text)
    sentences = [sentence for sentence in re.split(r"[.!?]+", text) if sentence.strip()]
    average_length = len(text.split()) / max(len(sentences), 1)
    long_word_share = sum(len(word) >= 9 for word in words) / max(len(words), 1)
    # TUNE: sentence length and long words are proxies, not measured reading difficulty.
    return 0.5 * min(average_length / 30, 1) + 0.5 * long_word_share


def chunk_material(text: str) -> list[ChunkDraft]:
    words = text.split()
    if not words:
        return []

    blocks = re.split(r"\n\s*\n|\n(?=#)", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        units = re.split(r"(?<=[.!?])\s+", block) if len(block.split()) > MAX_BLOCK_WORDS else [block]
        for unit in units:
            unit_words = unit.split()
            pieces = (
                [" ".join(unit_words[start:start + TARGET_WORDS]) for start in range(0, len(unit_words), TARGET_WORDS)]
                if len(unit_words) > MAX_BLOCK_WORDS else [unit]
            )
            for piece in pieces:
                size = len(piece.split())
                if current and current_words + size > TARGET_WORDS:
                    chunks.append("\n\n".join(current))
                    current = []
                    current_words = 0
                current.append(piece)
                current_words += size
    if current:
        chunks.append("\n\n".join(current))

    if len(chunks) < MIN_CHUNKS:
        count = min(MIN_CHUNKS, len(words))
        size, remainder = divmod(len(words), count)
        chunks = []
        start = 0
        for idx in range(count):
            end = start + size + (idx < remainder)
            chunks.append(" ".join(words[start:end]))
            start = end

    return [ChunkDraft(idx=idx, text=chunk, difficulty_est=_difficulty(chunk)) for idx, chunk in enumerate(chunks[:MAX_CHUNKS])]
