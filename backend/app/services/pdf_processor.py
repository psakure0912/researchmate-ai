import re
from dataclasses import dataclass
from typing import Dict, List, Optional
import fitz  # PyMuPDF

from app.core.logging import logger

_ocr_engine = None


def _get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _ocr_engine = RapidOCR()
        except Exception as exc:
            logger.warning("RapidOCR unavailable for scanned PDF fallback: %s", exc)
            _ocr_engine = False
    return _ocr_engine if _ocr_engine is not False else None


@dataclass
class ExtractedPage:
    page_number: int
    text: str
    used_ocr: bool = False


@dataclass
class ExtractedPDF:
    title: str
    authors: Optional[str]
    page_count: int
    pages: List[ExtractedPage]
    metadata: Dict[str, str]


def clean_academic_text(raw: str) -> str:
    """Clean extracted PDF text while preserving paragraph structure."""
    if not raw:
        return ""
    # Rejoin hyphenated line breaks typical in two-column papers
    text = re.sub(r"-\s*\n\s*", "", raw)
    # Collapse repeated spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse excessive newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def validate_pdf_bytes(file_bytes: bytes, max_size_mb: int) -> None:
    max_bytes = max_size_mb * 1024 * 1024
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty.")
    if len(file_bytes) > max_bytes:
        raise ValueError(f"File exceeds the maximum limit of {max_size_mb} MB.")
    if not file_bytes.lstrip()[:5].startswith(b"%PDF-"):
        raise ValueError("Invalid file signature. Only genuine PDF files are allowed.")


def extract_pdf_pages(file_bytes: bytes, fallback_title: str) -> ExtractedPDF:
    """Extract cleaned text page-by-page using PyMuPDF, with OCR fallback for scanned pages."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        meta = doc.metadata or {}
        title = (meta.get("title") or "").strip() or fallback_title
        authors = (meta.get("author") or "").strip() or None

        extracted_pages: List[ExtractedPage] = []
        for idx, page in enumerate(doc, start=1):
            raw_text = page.get_text("text") or ""
            cleaned = clean_academic_text(raw_text)
            used_ocr = False

            # If a page has very little selectable text, run OCR fallback if available
            if len(cleaned) < 40:
                ocr = _get_ocr_engine()
                if ocr is not None:
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        ocr_res, _ = ocr(img_bytes)
                        if ocr_res:
                            ocr_text = "\n".join(item[1] for item in ocr_res if len(item) > 1)
                            ocr_cleaned = clean_academic_text(ocr_text)
                            if len(ocr_cleaned) > len(cleaned):
                                cleaned = ocr_cleaned
                                used_ocr = True
                    except Exception as exc:
                        logger.warning("OCR fallback failed on page %s: %s", idx, exc)

            if cleaned:
                extracted_pages.append(
                    ExtractedPage(page_number=idx, text=cleaned, used_ocr=used_ocr)
                )

        if not extracted_pages:
            raise ValueError(
                "No readable text could be extracted from this PDF (even after OCR fallback)."
            )

        return ExtractedPDF(
            title=title,
            authors=authors,
            page_count=len(doc),
            pages=extracted_pages,
            metadata={k: str(v) for k, v in meta.items() if v},
        )
    finally:
        doc.close()
