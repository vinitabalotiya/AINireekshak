"""CSV parser for bulk team imports."""

import csv
import io
import logging
from app.schemas.team import TeamImportRow, TeamMemberCreate

logger = logging.getLogger(__name__)


def parse_teams_csv(csv_text: str) -> list[TeamImportRow]:
    """Parse CSV text with team and member data.
    Supported column formats:
    - team_name, project_name, member1_name, member1_email, member2_name, member2_email...
    OR
    - team_name, project_name, member_name, member_email, member_role
    """
    f = io.StringIO(csv_text)
    reader = csv.DictReader(f)

    if not reader.fieldnames:
        return []

    # Normalize header names (lowercase, stripped)
    field_map = {name: name.strip().lower() for name in reader.fieldnames if name}

    # Group by team_name
    teams_dict: dict[str, dict] = {}

    for row in reader:
        # Extract row with normalized keys
        norm_row = {field_map[k]: v.strip() for k, v in row.items() if k in field_map and v}

        team_name = norm_row.get("team_name") or norm_row.get("team")
        if not team_name:
            continue

        project_name = norm_row.get("project_name") or norm_row.get("project")

        if team_name not in teams_dict:
            teams_dict[team_name] = {
                "team_name": team_name,
                "project_name": project_name,
                "members": [],
            }

        # Check for multi-column member format: member1_name, member2_name...
        found_numbered_members = False
        for i in range(1, 10):
            m_name = norm_row.get(f"member{i}_name") or norm_row.get(f"member_{i}_name")
            m_email = norm_row.get(f"member{i}_email") or norm_row.get(f"member_{i}_email")
            m_role = norm_row.get(f"member{i}_role") or norm_row.get(f"member_{i}_role") or ("Lead" if i == 1 else "Member")

            if m_name:
                found_numbered_members = True
                teams_dict[team_name]["members"].append(
                    TeamMemberCreate(name=m_name, email=m_email or None, role=m_role)
                )

        # Check single member format
        if not found_numbered_members:
            m_name = norm_row.get("member_name") or norm_row.get("name")
            m_email = norm_row.get("member_email") or norm_row.get("email")
            m_role = norm_row.get("member_role") or norm_row.get("role") or "Member"
            if m_name:
                teams_dict[team_name]["members"].append(
                    TeamMemberCreate(name=m_name, email=m_email or None, role=m_role)
                )

    rows: list[TeamImportRow] = []
    for t_data in teams_dict.values():
        rows.append(TeamImportRow(
            team_name=t_data["team_name"],
            project_name=t_data["project_name"],
            members=t_data["members"],
        ))

    logger.info("Parsed %d teams from CSV", len(rows))
    return rows
