import fitz
import pytest
from app.services.pdf_processor import (
    clean_academic_text,
    extract_pdf_pages,
    validate_pdf_bytes,
)


def _make_sample_pdf(text_pages: list[str]) -> bytes:
    doc = fitz.open()
    for content in text_pages:
        page = doc.new_page()
        page.insert_text((72, 72), content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_clean_academic_text_rejoins_hyphenated_words():
    raw = "Retrieval-augmented genera-\ntion improves groundedness   significantly."
    cleaned = clean_academic_text(raw)
    assert "generation improves groundedness significantly." in cleaned


def test_validate_pdf_bytes_rejects_non_pdf():
    with pytest.raises(ValueError, match="Invalid file signature"):
        validate_pdf_bytes(b"NOT A PDF", max_size_mb=5)


def test_extract_pdf_pages_preserves_page_numbers():
    pdf_bytes = _make_sample_pdf(
        [
            "Page one discusses transformer self-attention mechanisms in detail.",
            "Page two evaluates BLEU scores on WMT datasets with experimental results.",
        ]
    )
    extracted = extract_pdf_pages(pdf_bytes, fallback_title="Transformer Paper")
    assert extracted.page_count == 2
    assert len(extracted.pages) == 2
    assert extracted.pages[0].page_number == 1
    assert "self-attention" in extracted.pages[0].text
    assert extracted.pages[1].page_number == 2
    assert "BLEU" in extracted.pages[1].text
