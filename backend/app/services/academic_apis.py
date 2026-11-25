import asyncio
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import Settings
from app.core.logging import logger

S2_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
ARXIV_API_URL = "https://export.arxiv.org/api/query"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


async def _get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    params: Dict[str, Any],
    headers: Dict[str, str],
    retries: int = 2,
) -> httpx.Response:
    delay = 1.0
    for attempt in range(retries + 1):
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 429 and attempt < retries:
            await asyncio.sleep(delay)
            delay *= 2
            continue
        resp.raise_for_status()
        return resp
    raise RuntimeError("Exceeded retry limit")


async def search_semantic_scholar(
    query: str,
    settings: Settings,
    limit: int = 10,
    year_from: Optional[int] = None,
) -> List[Dict[str, Any]]:
    headers = {"User-Agent": "ResearchMateAI/1.0"}
    if settings.SEMANTIC_SCHOLAR_API_KEY:
        headers["x-api-key"] = settings.SEMANTIC_SCHOLAR_API_KEY

    params: Dict[str, Any] = {
        "query": query,
        "limit": min(max(limit, 1), 25),
        "fields": "paperId,title,abstract,year,authors,url,openAccessPdf,citationCount,publicationDate",
    }
    if year_from:
        params["year"] = f"{year_from}-"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await _get_with_retry(client, S2_SEARCH_URL, params, headers)
        data = resp.json().get("data", [])

    results: List[Dict[str, Any]] = []
    for item in data:
        paper_id = item.get("paperId")
        title = (item.get("title") or "").strip()
        if not paper_id or not title:
            continue
        pdf_info = item.get("openAccessPdf") or {}
        results.append(
            {
                "source": "semantic_scholar",
                "external_id": paper_id,
                "title": title,
                "authors": [a.get("name", "") for a in (item.get("authors") or []) if a.get("name")],
                "abstract": item.get("abstract"),
                "publication_year": item.get("year"),
                "published_date": item.get("publicationDate"),
                "url": item.get("url") or f"https://www.semanticscholar.org/paper/{paper_id}",
                "pdf_url": pdf_info.get("url"),
                "citation_count": item.get("citationCount"),
            }
        )
    return results


def parse_arxiv_feed(xml_text: str, year_from: Optional[int] = None) -> List[Dict[str, Any]]:
    root = ET.fromstring(xml_text)
    results: List[Dict[str, Any]] = []

    for entry in root.findall("atom:entry", ATOM_NS):
        raw_id = (entry.findtext("atom:id", default="", namespaces=ATOM_NS) or "").strip()
        title = " ".join(
            (entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").split()
        )
        summary = " ".join(
            (entry.findtext("atom:summary", default="", namespaces=ATOM_NS) or "").split()
        )
        published = (entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "")[:10]
        pub_year = int(published[:4]) if len(published) >= 4 and published[:4].isdigit() else None

        if year_from and pub_year and pub_year < year_from:
            continue

        authors = [
            (a.findtext("atom:name", default="", namespaces=ATOM_NS) or "").strip()
            for a in entry.findall("atom:author", ATOM_NS)
        ]
        authors = [a for a in authors if a]

        pdf_url = None
        for link in entry.findall("atom:link", ATOM_NS):
            if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                pdf_url = link.attrib.get("href")
                break

        external_id = raw_id.rsplit("/", 1)[-1] if raw_id else title
        results.append(
            {
                "source": "arxiv",
                "external_id": external_id,
                "title": title,
                "authors": authors,
                "abstract": summary or None,
                "publication_year": pub_year,
                "published_date": published or None,
                "url": raw_id,
                "pdf_url": pdf_url,
                "citation_count": None,
            }
        )

    return results


async def search_arxiv(
    query: str,
    settings: Settings,
    limit: int = 10,
    year_from: Optional[int] = None,
) -> List[Dict[str, Any]]:
    headers = {"User-Agent": f"ResearchMateAI/1.0 (mailto:{settings.ARXIV_CONTACT_EMAIL})"}
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": min(max(limit, 1), 25),
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await _get_with_retry(client, ARXIV_API_URL, params, headers)
        return parse_arxiv_feed(resp.text, year_from=year_from)


async def search_academic_papers(
    query: str,
    source: str,
    settings: Settings,
    limit: int = 10,
    year_from: Optional[int] = None,
) -> Dict[str, Any]:
    errors: List[str] = []
    combined: List[Dict[str, Any]] = []

    if source == "semantic_scholar":
        try:
            combined = await search_semantic_scholar(query, settings, limit, year_from)
        except Exception as exc:
            logger.warning("Semantic Scholar failed, falling back to arXiv: %s", exc)
            errors.append(f"Semantic Scholar unavailable: {exc}")
            combined = await search_arxiv(query, settings, limit, year_from)
    elif source == "arxiv":
        combined = await search_arxiv(query, settings, limit, year_from)
    else:
        half = max(limit // 2, 4)
        s2_task = search_semantic_scholar(query, settings, half, year_from)
        ax_task = search_arxiv(query, settings, half, year_from)
        s2_res, ax_res = await asyncio.gather(s2_task, ax_task, return_exceptions=True)

        if isinstance(s2_res, Exception):
            logger.warning("Semantic Scholar search error: %s", s2_res)
            errors.append(f"Semantic Scholar error: {s2_res}")
        else:
            combined.extend(s2_res)

        if isinstance(ax_res, Exception):
            logger.warning("arXiv search error: %s", ax_res)
            errors.append(f"arXiv error: {ax_res}")
        else:
            combined.extend(ax_res)

    return {"results": combined, "warnings": errors}
