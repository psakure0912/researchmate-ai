from app.services.academic_apis import parse_arxiv_feed

SAMPLE_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2312.10997v1</id>
    <published>2023-12-18T18:00:00Z</published>
    <title>Retrieval-Augmented Generation for Large Language Models: A Survey</title>
    <summary>A comprehensive survey of RAG architectures.</summary>
    <author><name>Yunfan Gao</name></author>
    <link title="pdf" href="http://arxiv.org/pdf/2312.10997v1" rel="related" type="application/pdf"/>
  </entry>
</feed>
"""


def test_parse_arxiv_feed_extracts_metadata():
    papers = parse_arxiv_feed(SAMPLE_ATOM, year_from=2022)
    assert len(papers) == 1
    p = papers[0]
    assert p["source"] == "arxiv"
    assert p["publication_year"] == 2023
    assert p["authors"] == ["Yunfan Gao"]
    assert p["pdf_url"] == "http://arxiv.org/pdf/2312.10997v1"


def test_parse_arxiv_feed_filters_by_year():
    papers = parse_arxiv_feed(SAMPLE_ATOM, year_from=2025)
    assert papers == []
