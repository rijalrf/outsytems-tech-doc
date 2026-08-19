from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from agentic import engine
from agentic.functions import registry
from clients import openai_client
from core import config, database
from schemas import agentic_schema

router = APIRouter()


@router.post(
    "/chat",
    response_model=agentic_schema.AgentChatResponse,
    summary="Kirim Pesan ke AI Documentation Assistant",
    description="Endpoint tanya jawab interaktif dengan AI Agent yang dilengkapi automated Tool Calling untuk mengakses data modul, aplikasi, dan entitas OutSystems.",
)
async def chat_with_agent(
    req: agentic_schema.AgentChatRequest,
    db: Session = Depends(database.get_db),
):
    # Validasi konfigurasi OpenAI
    if not openai_client.openai_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API Key belum dikonfigurasi di backend (.env). Harap atur OPENAI_API_KEY.",
        )

    try:
        messages_payload = [m.model_dump() for m in req.messages]
        context_payload = req.context.model_dump() if req.context else None

        result = await engine.agentic_engine.run_chat(
            db=db,
            messages=messages_payload,
            context_info=context_payload,
            model=req.model,
            temperature=req.temperature,
        )

        return agentic_schema.AgentChatResponse(
            role=result["role"],
            content=result["content"],
            tool_calls=result.get("tool_calls", []),
            model=result.get("model", config.settings.openai_model),
            usage=result.get("usage", {}),
            iterations=result.get("iterations", 1),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat memproses percakapan AI: {str(e)}",
        )


@router.get(
    "/tools",
    response_model=List[Dict[str, Any]],
    summary="Daftar Tools & Function Calling Schemas",
    description="Mengembalikan seluruh definisi OpenAI tool calling JSON schema yang terdaftar pada sistem.",
)
def get_available_tools():
    return registry.OPENAI_TOOLS


@router.get(
    "/status",
    response_model=agentic_schema.AgentStatusResponse,
    summary="Status Integrasi OpenAI LLM",
    description="Memeriksa status ketersediaan API key, base URL, dan model LLM yang aktif.",
)
def get_agent_status():
    return agentic_schema.AgentStatusResponse(
        is_configured=openai_client.openai_client.is_configured(),
        base_url=config.settings.openai_base_url,
        active_model=config.settings.openai_model,
        total_tools_available=len(registry.OPENAI_TOOLS),
    )
