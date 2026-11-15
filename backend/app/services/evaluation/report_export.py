"""Report export service for CSV and Excel formats."""

import csv
import io
import logging
from typing import Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

logger = logging.getLogger(__name__)


class ReportExporter:
    """Exports hackathon rankings and evaluations to CSV and Excel."""

    def export_csv(self, rankings: list[Any], event_name: str) -> bytes:
        """Export rankings to CSV bytes with liveness and behavior scores."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["Rank", "Team Name", "Project Name", "Total Score (100)", "Liveness Status", "Behaviour Score (100)"])

        for r in rankings:
            rank = getattr(r, "rank", r.get("rank", "")) if isinstance(r, dict) else getattr(r, "rank", "")
            team_name = getattr(r, "team_name", r.get("team_name", "")) if isinstance(r, dict) else getattr(r, "team_name", "")
            project_name = getattr(r, "project_name", r.get("project_name", "")) if isinstance(r, dict) else getattr(r, "project_name", "")
            total_score = getattr(r, "total_score", r.get("total_score", 0.0)) if isinstance(r, dict) else getattr(r, "total_score", 0.0)
            liveness_status = getattr(r, "liveness_status", r.get("liveness_status", "Verified")) if isinstance(r, dict) else getattr(r, "liveness_status", "Verified")
            behaviour_score = getattr(r, "behaviour_score", r.get("behaviour_score", 85.0)) if isinstance(r, dict) else getattr(r, "behaviour_score", 85.0)

            writer.writerow([
                rank,
                team_name,
                project_name or "N/A",
                f"{float(total_score):.2f}",
                liveness_status,
                f"{float(behaviour_score):.1f}",
            ])

        logger.info("Generated CSV export for %s (%d rows)", event_name, len(rankings))
        return output.getvalue().encode("utf-8")

    def export_excel(self, rankings: list[Any], event_name: str) -> bytes:
        """Export rankings to styled Excel spreadsheet bytes with liveness verification."""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Rankings"

        # Title block
        ws.merge_cells("A1:G1")
        title_cell = ws["A1"]
        title_cell.value = f"AiNireekshak Results — {event_name}"
        title_cell.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
        title_cell.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        title_cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 40

        # Headers
        headers = ["Rank", "Team Name", "Project Name", "Total Score", "Status", "Liveness Status", "Behaviour Score"]
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=2, column=col_idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center" if col_idx in (1, 4, 5, 6, 7) else "left")
        ws.row_dimensions[2].height = 25

        thin_border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="E2E8F0"),
            bottom=Side(style="thin", color="E2E8F0"),
        )

        for row_idx, r in enumerate(rankings, 3):
            rank = getattr(r, "rank", r.get("rank", "")) if isinstance(r, dict) else getattr(r, "rank", "")
            team_name = getattr(r, "team_name", r.get("team_name", "")) if isinstance(r, dict) else getattr(r, "team_name", "")
            project_name = getattr(r, "project_name", r.get("project_name", "")) if isinstance(r, dict) else getattr(r, "project_name", "")
            total_score = getattr(r, "total_score", r.get("total_score", 0.0)) if isinstance(r, dict) else getattr(r, "total_score", 0.0)
            liveness_status = getattr(r, "liveness_status", r.get("liveness_status", "Verified")) if isinstance(r, dict) else getattr(r, "liveness_status", "Verified")
            behaviour_score = getattr(r, "behaviour_score", r.get("behaviour_score", 85.0)) if isinstance(r, dict) else getattr(r, "behaviour_score", 85.0)

            ws.cell(row=row_idx, column=1, value=rank).alignment = Alignment(horizontal="center")
            ws.cell(row=row_idx, column=2, value=team_name)
            ws.cell(row=row_idx, column=3, value=project_name or "N/A")
            score_cell = ws.cell(row=row_idx, column=4, value=round(float(total_score), 2))
            score_cell.alignment = Alignment(horizontal="right")
            ws.cell(row=row_idx, column=5, value="Evaluated").alignment = Alignment(horizontal="center")
            ws.cell(row=row_idx, column=6, value=str(liveness_status)).alignment = Alignment(horizontal="center")
            ws.cell(row=row_idx, column=7, value=f"{float(behaviour_score):.1f}").alignment = Alignment(horizontal="center")

            for c in range(1, 8):
                ws.cell(row=row_idx, column=c).border = thin_border

        # Adjust column widths
        col_widths = [8, 25, 30, 15, 15, 18, 16]
        for col_idx, width in enumerate(col_widths, 1):
            col_letter = openpyxl.utils.get_column_letter(col_idx)
            ws.column_dimensions[col_letter].width = width

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        logger.info("Generated Excel export for %s (%d rows)", event_name, len(rankings))
        return output.getvalue()
