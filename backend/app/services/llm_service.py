import json
from typing import Any, Dict, List, Type, TypeVar
from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import Settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class GeminiLLMService:
    """Google Gemini integration with primary/fallback model resilience and structured JSON output."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured. Add your Google AI Studio key to backend/.env."
            )
        if self._client is None:
            self._client = genai.Client(api_key=self.settings.GEMINI_API_KEY)
        return self._client

    def _models_to_try(self) -> List[str]:
        models = [self.settings.GEMINI_PRIMARY_MODEL]
        if (
            self.settings.GEMINI_FALLBACK_MODEL
            and self.settings.GEMINI_FALLBACK_MODEL not in models
        ):
            models.append(self.settings.GEMINI_FALLBACK_MODEL)
        return models

    def generate_text(
        self,
        system_instruction: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> str:
        client = self._get_client()
        last_err: Exception | None = None
        for model_name in self._models_to_try():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                    ),
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s", model_name, exc)
                last_err = exc
        raise RuntimeError(f"All Gemini models failed: {last_err}")

    def generate_structured(
        self,
        system_instruction: str,
        user_prompt: str,
        response_schema: Type[T],
        temperature: float = 0.15,
    ) -> Dict[str, Any]:
        client = self._get_client()
        last_err: Exception | None = None
        for model_name in self._models_to_try():
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                    ),
                )
                if response and response.text:
                    parsed = json.loads(response.text)
                    return response_schema.model_validate(parsed).model_dump()
            except Exception as exc:
                logger.warning("Gemini structured model %s failed: %s", model_name, exc)
                last_err = exc
        raise RuntimeError(f"Structured Gemini generation failed: {last_err}")
