import json
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from agentic import prompts
from agentic.functions import registry
from clients import openai_client


class AgenticEngine:
    """
    Engine orkestrasi untuk agentic loop yang mendukung multi-step tool calling kompatibel OpenAI.
    """

    def __init__(
        self,
        client: Optional[openai_client.OpenAIClient] = None,
        max_iterations: int = 6,
    ):
        self.client = client or openai_client.openai_client
        self.max_iterations = max_iterations

    async def run_chat(
        self,
        db: Session,
        messages: List[Dict[str, Any]],
        context_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Menjalankan loop interaksi agentic:
        1. Membangun initial prompt dengan system persona & context aktif.
        2. Mengirim ke LLM dengan daftar tools.
        3. Mengeksekusi function calls yang diminta LLM secara berulang hingga selesai.
        4. Mengembalikan respons akhir dan jejak eksekusi tool (tool traces).
        """
        conversation: List[Dict[str, Any]] = []

        # 1. System Prompt & Persona
        system_content = prompts.SYSTEM_PERSONA
        if context_info:
            system_content += "\n\n### Konteks Aktif Saat Ini dari Pengguna:\n"
            if context_info.get("project_id"):
                system_content += f"- Active Project ID: {context_info['project_id']}\n"
            if context_info.get("application_id"):
                system_content += f"- Active Application ID: {context_info['application_id']}\n"
            if context_info.get("application_name"):
                system_content += f"- Active Application Name: {context_info['application_name']}\n"
            if context_info.get("module_id"):
                system_content += f"- Active Module ID: {context_info['module_id']}\n"
            if context_info.get("module_name"):
                system_content += f"- Active Module Name: {context_info['module_name']}\n"

        conversation.append({"role": "system", "content": system_content})

        # 2. Append history messages
        for msg in messages:
            # Pastikan hanya key yang valid untuk OpenAI
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant", "system"]:
                conversation.append({"role": role, "content": content})

        executed_tool_traces: List[Dict[str, Any]] = []
        iteration = 0

        while iteration < self.max_iterations:
            iteration += 1

            # Panggil LLM
            response = await self.client.create_chat_completion(
                messages=conversation,
                tools=registry.OPENAI_TOOLS,
                tool_choice="auto",
                model=model,
                temperature=temperature,
            )

            choice = response.get("choices", [{}])[0]
            message_obj = choice.get("message", {})
            tool_calls = message_obj.get("tool_calls")

            # Jika tidak ada tool calls, berarti LLM telah selesai dan memberikan jawaban final
            if not tool_calls:
                final_content = message_obj.get("content", "")
                return {
                    "role": "assistant",
                    "content": final_content,
                    "tool_calls": executed_tool_traces,
                    "model": response.get("model", model or self.client.default_model),
                    "usage": response.get("usage", {}),
                    "iterations": iteration,
                }

            # Simpan pesan assistant yang meminta tool calls ke riwayat percakapan
            conversation.append(message_obj)

            # Eksekusi setiap tool call
            for t_call in tool_calls:
                t_id = t_call.get("id")
                func_obj = t_call.get("function", {})
                func_name = func_obj.get("name")
                args_raw = func_obj.get("arguments", "{}")

                try:
                    if isinstance(args_raw, str):
                        parsed_args = json.loads(args_raw)
                    elif isinstance(args_raw, dict):
                        parsed_args = args_raw
                    else:
                        parsed_args = {}
                except json.JSONDecodeError:
                    parsed_args = {}

                # Jalankan fungsi pada backend via registry dispatcher
                tool_result = registry.execute_tool_call(
                    db=db,
                    tool_name=func_name,
                    arguments=parsed_args,
                )

                tool_result_str = json.dumps(tool_result, ensure_ascii=False)

                # Rekam ke jejak eksekusi untuk ditransparansikan ke Frontend UI
                executed_tool_traces.append({
                    "id": t_id,
                    "tool_name": func_name,
                    "arguments": parsed_args,
                    "result_preview": str(tool_result)[:300] + ("..." if len(str(tool_result)) > 300 else ""),
                })

                # Kirimkan hasil tool ke percakapan LLM
                conversation.append({
                    "role": "tool",
                    "tool_call_id": t_id,
                    "name": func_name,
                    "content": tool_result_str,
                })

        # Jika mencapai max iterations
        return {
            "role": "assistant",
            "content": "Maaf, proses pemrosesan mencapai batas iterasi maksimum. Silakan ajukan pertanyaan yang lebih spesifik.",
            "tool_calls": executed_tool_traces,
            "model": model or self.client.default_model,
            "usage": {},
            "iterations": iteration,
        }


agentic_engine = AgenticEngine()
