import os
from pathlib import Path
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session


def get_template_path() -> Path:
    """
    Mengambil path file template Technical_Specification_Template-v2.md di root workspace.
    """
    current_dir = Path(__file__).resolve().parent
    root_dir = current_dir.parent.parent.parent
    template_file = root_dir / "Technical_Specification_Template-v2.md"
    if not template_file.exists():
        cwd_template = Path.cwd() / "Technical_Specification_Template-v2.md"
        if cwd_template.exists():
            return cwd_template
        cwd_parent_template = Path.cwd().parent / "Technical_Specification_Template-v2.md"
        if cwd_parent_template.exists():
            return cwd_parent_template
    return template_file


def get_technical_doc_template(db: Session, template_name: str = "default") -> Dict[str, Any]:
    """
    Membaca dan mengembalikan konten mentah Markdown dari template spesifikasi teknis OutSystems.
    """
    path = get_template_path()
    if not path.exists():
        return {
            "status": "error",
            "message": f"File template tidak ditemukan pada path: {path}",
            "template_content": "",
        }

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return {
            "status": "success",
            "template_name": template_name,
            "filename": path.name,
            "total_lines": len(content.splitlines()),
            "template_content": content,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Gagal membaca file template: {str(e)}",
            "template_content": "",
        }


def update_document_section(
    db: Session,
    section_title: str,
    content: str,
    placeholder_target: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fungsi tool bagi AI untuk secara eksplisit memperbarui section atau placeholder pada dokumen FSD teknis.
    """
    return {
        "status": "success",
        "action": "update_section",
        "section_title": section_title,
        "placeholder_target": placeholder_target,
        "content_length": len(content),
        "content": content,
        "message": f"Section '{section_title}' berhasil diperbarui dengan konten Markdown yang digenerate.",
    }
