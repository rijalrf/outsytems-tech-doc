from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role pengirim pesan ('user', 'assistant', 'system')")
    content: str = Field(..., description="Konten isi pesan teks")


class ChatContextInfo(BaseModel):
    project_id: Optional[str] = Field(None, description="UUID Project aktif jika ada")
    application_id: Optional[str] = Field(None, description="UUID Application aktif jika ada")
    application_name: Optional[str] = Field(None, description="Nama Application aktif jika ada")
    module_id: Optional[str] = Field(None, description="UUID Modul aktif jika ada")
    module_name: Optional[str] = Field(None, description="Nama Modul aktif jika ada")


class AgentChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Riwayat pesan percakapan")
    context: Optional[ChatContextInfo] = Field(None, description="Konteks proyek/aplikasi/modul saat ini")
    model: Optional[str] = Field(None, description="Model LLM spesifik yang ingin digunakan (opsional)")
    temperature: Optional[float] = Field(None, description="Kreativitas model LLM (0.0 - 1.0)")


class ToolCallTrace(BaseModel):
    id: Optional[str] = None
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    result_preview: Optional[str] = None


class AgentChatResponse(BaseModel):
    role: str = "assistant"
    content: str = Field(..., description="Jawaban final dari AI Assistant")
    tool_calls: List[ToolCallTrace] = Field(default_factory=list, description="Daftar tools yang dipanggil oleh AI selama menjawab")
    model: str
    usage: Dict[str, Any] = Field(default_factory=dict)
    iterations: int = 1


class AgentStatusResponse(BaseModel):
    is_configured: bool
    base_url: str
    active_model: str
    total_tools_available: int
