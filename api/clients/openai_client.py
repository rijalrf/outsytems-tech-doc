import json
from typing import Any, Dict, List, Optional
import httpx

from core import config


class OpenAIClient:
    """
    Client HTTP untuk berinteraksi dengan API OpenAI atau provider kompatibel OpenAI
    (seperti OpenRouter, Ollama, vLLM, DeepSeek, LocalAI, dll).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        temperature: Optional[float] = None,
        timeout: float = 180.0,
    ):
        self.api_key = api_key if api_key is not None else config.settings.openai_api_key
        self.base_url = (base_url if base_url is not None else config.settings.openai_base_url).rstrip("/")
        self.default_model = default_model if default_model is not None else config.settings.openai_model
        self.temperature = temperature if temperature is not None else config.settings.openai_temperature
        self.timeout = timeout

    def is_configured(self) -> bool:
        """Memeriksa apakah API Key atau base URL telah dikonfigurasi."""
        if "localhost" in self.base_url or "127.0.0.1" in self.base_url:
            return True
        return bool(self.api_key and self.api_key.strip())

    async def create_chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[str | Dict[str, Any]] = "auto",
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Mengirim request chat completion ke endpoint OpenAI-compatible (/chat/completions).
        """
        if not self.is_configured():
            raise ValueError(
                "OpenAI API Key belum dikonfigurasi. Harap isi OPENAI_API_KEY di file .env atau konfigurasi sistem."
            )

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload: Dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "stream": False,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        if tools:
            payload["tools"] = tools
            if tool_choice:
                payload["tool_choice"] = tool_choice

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    err_json = response.json()
                    error_detail = err_json.get("error", {}).get("message", response.text)
                except Exception:
                    pass
                raise RuntimeError(
                    f"OpenAI API Error ({response.status_code}): {error_detail}"
                )

            content_type = response.headers.get("content-type", "").lower()
            text_data = response.text.strip()

            # 1. Normal JSON response or extracted JSON object
            parsed_json = None
            try:
                parsed_json = response.json()
            except Exception:
                # Coba cari kurung kurawal pertama dan terakhir jika ada trailing data: [DONE]
                first_brace = text_data.find("{")
                last_brace = text_data.rfind("}")
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    try:
                        parsed_json = json.loads(text_data[first_brace : last_brace + 1])
                    except Exception:
                        pass

            if parsed_json and isinstance(parsed_json, dict) and "choices" in parsed_json:
                choices = parsed_json.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {})
                    # Jika content kosong tapi reasoning_content ada, gunakan reasoning_content
                    if not msg.get("content") and msg.get("reasoning_content"):
                        msg["content"] = msg["reasoning_content"]
                return parsed_json

            # 2. SSE Fallback parsing (jika provider mengembalikan stream secara default)
            aggregated_content = []
            aggregated_tool_calls: Dict[int, Dict[str, Any]] = {}
            model_used = model or self.default_model

            for line in text_data.split("\n"):
                line_str = line.strip()
                if not line_str or line_str.startswith(":"):
                    continue
                if line_str.startswith("data:"):
                    raw_chunk = line_str[len("data:"):].strip()
                    if raw_chunk == "[DONE]":
                        break
                    try:
                        chunk = json.loads(raw_chunk)
                        if "model" in chunk:
                            model_used = chunk["model"]
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content_piece = delta.get("content") or delta.get("reasoning_content")
                            if content_piece:
                                aggregated_content.append(content_piece)
                            # Tool calls in stream
                            for tc in delta.get("tool_calls", []):
                                idx = tc.get("index", 0)
                                if idx not in aggregated_tool_calls:
                                    aggregated_tool_calls[idx] = {
                                        "id": tc.get("id", ""),
                                        "type": "function",
                                        "function": {"name": "", "arguments": ""},
                                    }
                                if tc.get("id"):
                                    aggregated_tool_calls[idx]["id"] = tc["id"]
                                if tc.get("function", {}).get("name"):
                                    aggregated_tool_calls[idx]["function"]["name"] += tc["function"]["name"]
                                if tc.get("function", {}).get("arguments"):
                                    aggregated_tool_calls[idx]["function"]["arguments"] += tc["function"]["arguments"]
                    except Exception:
                        continue

            final_message: Dict[str, Any] = {
                "role": "assistant",
                "content": "".join(aggregated_content) if aggregated_content else None,
            }
            if aggregated_tool_calls:
                final_message["tool_calls"] = list(aggregated_tool_calls.values())

            return {
                "id": "chatcmpl-stream-agg",
                "object": "chat.completion",
                "model": model_used,
                "choices": [
                    {
                        "index": 0,
                        "message": final_message,
                        "finish_reason": "stop",
                    }
                ],
                "usage": {},
            }


openai_client = OpenAIClient()
