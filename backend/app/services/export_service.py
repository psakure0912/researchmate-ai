import csv
import io
from typing import Any, Dict, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RMTitle", parent=styles["Heading1"], fontSize=16, spaceAfter=10, textColor=colors.HexColor("#1e293b")
    )
    heading_style = ParagraphStyle(
        "RMHeading", parent=styles["Heading2"], fontSize=11, spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#4338ca")
    )
    body_style = ParagraphStyle(
        "RMBody", parent=styles["BodyText"], fontSize=9.5, leading=13, textColor=colors.HexColor("#334155")
    )
    return title_style, heading_style, body_style


def export_summary_pdf(doc_title: str, summary: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    title_style, heading_style, body_style = _styles()

    story = [
        Paragraph(f"ResearchMate AI — Paper Summary", heading_style),
        Paragraph(doc_title, title_style),
        Spacer(1, 6),
    ]

    sections = [
        ("Abstract Summary", summary.get("abstract_summary", "")),
        ("Problem Statement", summary.get("problem_statement", "")),
        ("Research Objectives", summary.get("research_objectives", [])),
        ("Proposed Methodology", summary.get("proposed_methodology", "")),
        ("Dataset", summary.get("dataset", "")),
        ("Algorithms Used", summary.get("algorithms_used", [])),
        ("Experimental Results", summary.get("experimental_results", "")),
        ("Limitations", summary.get("limitations", [])),
        ("Future Scope", summary.get("future_scope", [])),
    ]

    for label, value in sections:
        story.append(Paragraph(label, heading_style))
        if isinstance(value, list):
            for item in value:
                story.append(Paragraph(f"• {item}", body_style))
        else:
            story.append(Paragraph(str(value or "Not specified"), body_style))
        story.append(Spacer(1, 4))

    doc.build(story)
    return buf.getvalue()


def export_literature_review_csv(rows: List[Dict[str, Any]]) -> bytes:
    buf = io.StringIO()
    fieldnames = [
        "title",
        "publication_year",
        "research_objectives",
        "methodology",
        "dataset",
        "algorithms_or_techniques",
        "results",
        "limitations",
        "research_gaps",
    ]
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in fieldnames})
    return buf.getvalue().encode("utf-8")


def export_literature_review_pdf(title: str, rows: List[Dict[str, Any]]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=24, rightMargin=24, topMargin=28, bottomMargin=28)
    title_style, heading_style, body_style = _styles()
    cell_style = ParagraphStyle("Cell", parent=body_style, fontSize=7.5, leading=10)

    story = [
        Paragraph("ResearchMate AI — Literature Review Comparison", heading_style),
        Paragraph(title, title_style),
        Spacer(1, 6),
    ]

    headers = [
        "Title",
        "Year",
        "Objectives",
        "Methodology",
        "Dataset",
        "Algorithms",
        "Results",
        "Limitations",
        "Research Gaps",
    ]
    keys = [
        "title",
        "publication_year",
        "research_objectives",
        "methodology",
        "dataset",
        "algorithms_or_techniques",
        "results",
        "limitations",
        "research_gaps",
    ]

    table_data = [[Paragraph(f"<b>{h}</b>", cell_style) for h in headers]]
    for row in rows:
        table_data.append([Paragraph(str(row.get(k, "")), cell_style) for k in keys])

    table = Table(table_data, repeatRows=1, colWidths=[95, 36, 95, 95, 78, 82, 95, 95, 95])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef2ff")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buf.getvalue()


def export_gap_report_csv(report: Dict[str, Any]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Category", "Title / Item", "Details", "Supporting References / Impact"])

    for theme in report.get("common_themes", []):
        writer.writerow(["Common Theme", theme, "", ""])
    for approach in report.get("existing_approaches", []):
        writer.writerow(["Existing Approach", approach, "", ""])
    for method in report.get("frequent_methodologies", []):
        writer.writerow(["Frequent Methodology", method, "", ""])
    for lim in report.get("shared_limitations", []):
        writer.writerow(["Shared Limitation", lim, "", ""])
    for gap in report.get("evidence_backed_gaps", []):
        writer.writerow([
            "Evidence-Backed Gap",
            gap.get("gap_title", ""),
            gap.get("description", ""),
            "; ".join(gap.get("supporting_references", [])),
        ])
    for opp in report.get("ai_suggested_opportunities", []):
        writer.writerow([
            "AI-Suggested Opportunity",
            opp.get("direction_title", ""),
            opp.get("rationale", ""),
            opp.get("potential_impact", ""),
        ])

    return buf.getvalue().encode("utf-8")


def export_gap_report_pdf(title: str, report: Dict[str, Any]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    title_style, heading_style, body_style = _styles()

    story = [
        Paragraph("ResearchMate AI — Research Gap Report", heading_style),
        Paragraph(title, title_style),
        Spacer(1, 6),
    ]

    for label, key in [
        ("Common Research Themes", "common_themes"),
        ("Existing Approaches", "existing_approaches"),
        ("Frequently Used Methodologies", "frequent_methodologies"),
        ("Shared Limitations Across Studies", "shared_limitations"),
    ]:
        story.append(Paragraph(label, heading_style))
        for item in report.get(key, []):
            story.append(Paragraph(f"• {item}", body_style))

    story.append(Paragraph("Evidence-Backed Research Gaps (From Uploaded Papers)", heading_style))
    for gap in report.get("evidence_backed_gaps", []):
        refs = ", ".join(gap.get("supporting_references", []))
        story.append(Paragraph(f"<b>{gap.get('gap_title', '')}</b>: {gap.get('description', '')} <i>[{refs}]</i>", body_style))
        story.append(Spacer(1, 3))

    story.append(Paragraph("AI-Suggested Future Research Opportunities", heading_style))
    for opp in report.get("ai_suggested_opportunities", []):
        story.append(
            Paragraph(
                f"<b>{opp.get('direction_title', '')}</b>: {opp.get('rationale', '')} (Impact: {opp.get('potential_impact', '')})",
                body_style,
            )
        )
        story.append(Spacer(1, 3))

    doc.build(story)
    return buf.getvalue()
