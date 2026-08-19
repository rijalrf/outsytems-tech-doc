import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from core import database
from schemas import module_schema
from services import module_service

router = APIRouter()


@router.post(
    "/parse",
    response_model=module_schema.BatchProcessResponse,
    summary="Upload dan Parse File .oap atau .oml",
    description="Menerima file .oap (mengekstrak semua .oml) atau file tunggal .oml, memproses ke Outsystems API, dan menyimpan ke database PostgreSQL (bisa langsung dihubungkan ke project_id jika diberikan).",
)
async def parse_file(
    file: UploadFile = File(...),
    project_id: Optional[uuid.UUID] = Query(None, description="Opsional: Hubungkan hasil upload aplikasi ke Project ID tertentu"),
    db: Session = Depends(database.get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama file tidak valid.",
        )

    filename = file.filename
    ext = Path(filename).suffix.lower()

    if ext not in [".oap", ".oml"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format file tidak didukung. Harap upload file berekstensi .oap atau .oml.",
        )

    content = await file.read()

    # Kasus 1: File tunggal .oml
    if ext == ".oml":
        res = module_service.send_oml_to_api(file_bytes=content, filename=filename)
        parse_response = module_schema.OMLParseResponse(
            filename=filename,
            success=res.get("success", False),
            error=res.get("error"),
            module_info=res.get("module_info"),
            data=res.get("data"),
        )

        # Simpan ke PostgreSQL
        try:
            module_service.save_parsed_result(
                db=db,
                filename=filename,
                file_bytes=content,
                file_type="oml",
                module_results=[{
                    "filename": filename,
                    "module_info": res.get("module_info", {}),
                    "data": res.get("data", {}),
                }],
                project_id=project_id,
                status="COMPLETED" if res.get("success", False) else "FAILED",
                error_message=res.get("error"),
            )
        except Exception as db_err:
            print(f"Peringatan: Gagal menyimpan ke PostgreSQL: {db_err}")

        return module_schema.BatchProcessResponse(
            message=f"Berhasil memproses file tunggal {filename} dan menyimpannya ke database",
            total_files=1,
            results=[parse_response],
        )

    # Kasus 2: Arsip .oap
    try:
        oml_dict = module_service.extract_oml_from_bytes(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Gagal mengekstrak file OAP: {str(e)}",
        )

    if not oml_dict:
        return module_schema.BatchProcessResponse(
            message=f"Tidak ditemukan file .oml di dalam arsip {filename}",
            total_files=0,
            results=[],
        )

    results: List[module_schema.OMLParseResponse] = []
    db_module_results: List[Dict[str, Any]] = []

    for oml_name, oml_bytes in oml_dict.items():
        res = module_service.send_oml_to_api(file_bytes=oml_bytes, filename=oml_name)
        results.append(
            module_schema.OMLParseResponse(
                filename=oml_name,
                success=res.get("success", False),
                error=res.get("error"),
                module_info=res.get("module_info"),
                data=res.get("data"),
            )
        )
        db_module_results.append({
            "filename": oml_name,
            "module_info": res.get("module_info", {}),
            "data": res.get("data", {}),
        })

    # Simpan paket .oap dan seluruh modulnya ke PostgreSQL
    try:
        module_service.save_parsed_result(
            db=db,
            filename=filename,
            file_bytes=content,
            file_type="oap",
            module_results=db_module_results,
            project_id=project_id,
            status="COMPLETED",
        )
    except Exception as db_err:
        print(f"Peringatan: Gagal menyimpan ke PostgreSQL: {db_err}")

    return module_schema.BatchProcessResponse(
        message=f"Berhasil memproses {len(results)} modul OML dari {filename} dan menyimpannya ke database",
        total_files=len(results),
        results=results,
    )

