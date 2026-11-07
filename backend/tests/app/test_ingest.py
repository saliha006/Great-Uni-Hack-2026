import io

import pytest
from app.ingest import chunk_material, extract_text
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def test_long_material_preserves_words_and_bounds_chunk_sizes():
    paragraphs = [" ".join(f"word{idx}" for idx in range(start, start + 100)) for start in range(0, 1500, 100)]
    text = "\n\n".join(paragraphs)
    chunks = chunk_material(text)
    assert len(chunks) >= 3
    assert all(0 < len(chunk.text.split()) <= 450 for chunk in chunks)
    assert [chunk.idx for chunk in chunks] == list(range(len(chunks)))
    assert " ".join(chunk.text for chunk in chunks).split() == text.split()


def test_short_material_splits_into_three_balanced_chunks():
    text = " ".join(f"word{idx}" for idx in range(100))
    chunks = chunk_material(text)
    assert [len(chunk.text.split()) for chunk in chunks] == [34, 33, 33]
    assert " ".join(chunk.text for chunk in chunks) == text


def test_headings_start_blocks_without_blank_lines():
    paragraphs = [" ".join([f"section{idx}"] * 100) for idx in range(9)]
    text = "\n".join(f"# Topic {idx}\n{paragraph}" for idx, paragraph in enumerate(paragraphs))
    chunks = chunk_material(text)
    assert len(chunks) >= 3
    assert "\n\n# Topic 1\n" in chunks[0].text
    assert " ".join(chunk.text for chunk in chunks).split() == text.split()


@pytest.mark.parametrize("text", ["word " * 1500, ("word " * 29 + "end. ") * 50])
def test_oversized_block_is_split_without_losing_words(text):
    chunks = chunk_material(text)
    assert all(len(chunk.text.split()) <= 450 for chunk in chunks)
    assert " ".join(chunk.text for chunk in chunks).split() == text.split()


def test_difficulty_increases_with_long_sentences_and_words():
    easy = chunk_material("We read a book. " * 90)
    hard = chunk_material(" ".join(["photosynthesis"] * 900))
    assert all(0 <= chunk.difficulty_est <= 1 for chunk in easy + hard)
    assert max(chunk.difficulty_est for chunk in easy) < min(chunk.difficulty_est for chunk in hard)


@pytest.mark.parametrize("text,expected_count", [("", 0), (" \n\t", 0), ("hello", 1), ("hello world", 2)])
def test_tiny_input_has_no_empty_or_duplicated_chunks(text, expected_count):
    chunks = chunk_material(text)
    assert len(chunks) == expected_count
    assert all(chunk.text.strip() for chunk in chunks)
    assert " ".join(chunk.text for chunk in chunks).split() == text.split()


def test_blank_pdf_offers_paste_fallback():
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    output = io.BytesIO()
    writer.write(output)
    with pytest.raises(ValueError, match="No extractable text; paste the text instead"):
        extract_text(output.getvalue())


def test_pdf_extracts_text_from_multiple_pages():
    writer = PdfWriter()
    for text in ["First page", "Second page"]:
        page = writer.add_blank_page(width=200, height=200)
        font = DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        })
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): font}),
        })
        content = DecodedStreamObject()
        content.set_data(f"BT /F1 12 Tf 10 100 Td ({text}) Tj ET".encode())
        page[NameObject("/Contents")] = content
    output = io.BytesIO()
    writer.write(output)
    assert extract_text(output.getvalue()) == "First page\n\nSecond page"
