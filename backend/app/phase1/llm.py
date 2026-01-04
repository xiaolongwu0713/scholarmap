from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.audit_log import append_log
import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config
settings = config.settings
from app.phase1.models import Slots


SLOTS_PROMPT = """You are a scientific research description parser.

Your task:
- Read the user-provided research description (which may be in Chinese, English, or mixed).
- Extract the core semantic information into a fixed set of slots.
- ONLY use information explicitly present in the input text. Do NOT invent or assume new facts.
- If some slot is not mentioned in the text, leave it as an empty string "" (for scalar fields) or an empty array [] (for list fields).
- Output MUST be a valid JSON object matching the schema below. Do NOT add any extra fields, comments, or explanations.

JSON schema:
{
  "research_goal": "",
  "task": [],
  "method_measurement": [],
  "method_algorithm": [],
  "subject_population": [],
  "signal_feature": [],
  "output_target": [],
  "context": []
}

Constraints:
- Do NOT translate technical terms: keep ECoG, sEEG, BCI, etc. in their original form if they appear in the input.
- If the user writes in Chinese (e.g. “脑机接口”), you may convert it to its standard English technical term (e.g. "brain-computer interface").
- If the input is ambiguous, prefer shorter and more generic phrasing rather than making up specific details.

Output format:
- Return ONLY the JSON object, with no markdown, no code fences, and no additional text.
"""


NORMALIZE_PROMPT = """You are a scientific term normalization engine.
Your task is to normalize scientific phrases extracted from a research description.

Rules:
1. Convert informal or mixed-language expressions into standard English scientific terminology.
2. Remove non-essential modifiers (based on / using / approach to / method for).
3. Keep only domain-relevant and technically meaningful terms.
4. Do NOT invent any new concepts — only normalize what is explicitly provided.
5. Produce deduplicated canonical terms.

Your output MUST:
- Keep the exact same JSON structure as input.
- Replace each field with a normalized, deduplicated list of canonical English terms (research_goal can be a string).
- Be a valid JSON object only — no commentary, no markdown, no explanation.
"""


SYNONYM_PROMPT = """You are a scientific synonym generator for literature search.

Task:
- Given a canonical scientific term, propose common search synonyms, abbreviations, and spelling/format variants.
- DO NOT invent new concepts; only produce variants that refer to the same concept.
- Output must be a JSON array of strings only.
- Keep the list small and high-precision (<= 12 items).
"""


class OpenAIClient:
    def __init__(self) -> None:
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.reasoning_effort = (settings.openai_reasoning_effort or "").strip()
        self.api_base = (settings.openai_api_base or "https://api.openai.com").rstrip("/")

    async def _chat_json(
        self, 
        system_prompt: str, 
        user_text: str, 
        temperature: float = 0.0,
        log_context: dict[str, Any] | None = None
    ) -> Any:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        payload = {
            "model": self.model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
        }

        headers = {"authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{self.api_base}/v1/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        
        # Log full prompt and raw JSON response for debugging
        log_payload = {
            "model": self.model,
            "system_prompt": system_prompt,
            "user_text": user_text,
            "full_prompt": f"System: {system_prompt}\n\nUser: {user_text}",
            "raw_json_response": content,
        }
        if log_context:
            log_payload.update(log_context)
        append_log("llm.chat_json.response", log_payload)
        
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"OpenAI returned non-JSON: {e}") from e

    async def _responses_text(self, prompt: str, temperature: float = 0.0, log_context: dict[str, Any] | None = None) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "input": prompt,
            "temperature": temperature,
        }
        if self.reasoning_effort:
            payload["reasoning"] = {"effort": self.reasoning_effort}
        headers = {"authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(f"{self.api_base}/v1/responses", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        parts: list[str] = []
        for out in data.get("output", []) or []:
            for c in out.get("content", []) or []:
                if c.get("type") == "output_text" and c.get("text"):
                    parts.append(c["text"])
        if parts:
            raw_text = "\n".join(parts).strip()
        elif data.get("output_text"):
            raw_text = str(data["output_text"]).strip()
        else:
            raise RuntimeError("OpenAI responses API returned no text")
        
        # Log raw response for debugging
        log_payload = {
            "model": self.model,
            "api": "responses",
            "raw_response": raw_text,
        }
        if log_context:
            log_payload.update(log_context)
        append_log("llm.responses_text.response", log_payload)
        
        return raw_text

    async def complete_text(self, prompt: str, temperature: float = 0.0, log_context: dict[str, Any] | None = None) -> str:
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        # Prefer Responses API for "thinking"/reasoning models & controls.
        try:
            return await self._responses_text(prompt, temperature=temperature, log_context=log_context)
        except Exception:
            payload = {
                "model": self.model,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            }
            headers = {"authorization": f"Bearer {self.api_key}"}
            async with httpx.AsyncClient(timeout=180) as client:
                resp = await client.post(f"{self.api_base}/v1/chat/completions", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]
            
            # Log raw response for debugging (fallback to chat/completions API)
            log_payload = {
                "model": self.model,
                "api": "chat/completions",
                "raw_response": raw_content,
            }
            if log_context:
                log_payload.update(log_context)
            append_log("llm.complete_text.response", log_payload)
            
            return raw_content

    async def extract_slots(self, research_description: str, log_context: dict[str, Any] | None = None) -> Slots:
        slots_json = await self._chat_json(SLOTS_PROMPT, research_description, temperature=0.0, log_context=log_context)
        return Slots.model_validate(slots_json)

    async def normalize_slots(self, slots: Slots, log_context: dict[str, Any] | None = None) -> Slots:
        normalized_json = await self._chat_json(NORMALIZE_PROMPT, json.dumps(slots.model_dump(), ensure_ascii=False), temperature=0.0, log_context=log_context)
        return Slots.model_validate(normalized_json)

    async def generate_synonyms(self, term: str, log_context: dict[str, Any] | None = None) -> list[str]:
        data = await self._chat_json(SYNONYM_PROMPT, term, temperature=0.1, log_context=log_context)
        if not isinstance(data, list):
            raise RuntimeError("Synonym response is not a JSON array")
        out: list[str] = []
        for item in data:
            if isinstance(item, str):
                v = item.strip()
                if v:
                    out.append(v)
        seen: set[str] = set()
        deduped: list[str] = []
        for s in out:
            k = s.lower()
            if k in seen:
                continue
            seen.add(k)
            deduped.append(s)
        return deduped[:12]
