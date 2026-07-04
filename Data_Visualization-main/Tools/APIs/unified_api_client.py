"""
Unified API Client for Hood Alchemy Content Engine

Supports: OpenAI, Mistral, Google Gemini, DeepSeek, Ollama, ElevenLabs
"""

import os
from typing import Optional, Dict, List
from dataclasses import dataclass


@dataclass
class APIConfig:
    """Configuration for API clients."""
    openai_key: Optional[str] = None
    # Anthropic removed - add your API here if needed
    mistral_key: Optional[str] = None
    gemini_key: Optional[str] = None
    deepseek_key: Optional[str] = None
    elevenlabs_key: Optional[str] = None
    ollama_url: str = "http://localhost:11434/v1"


class UnifiedAPIClient:
    """Unified client for all supported APIs."""

    def __init__(self, config: Optional[APIConfig] = None):
        self.config = config or self._load_from_env()

    def _load_from_env(self) -> APIConfig:
        """Load API keys from environment variables."""
        return APIConfig(
            openai_key=os.environ.get("OPENAI_API_KEY"),
            # Anthropic removed - add your API here if needed
            mistral_key=os.environ.get("MISTRAL_API_KEY"),
            gemini_key=os.environ.get("GEMINI_API_KEY"),
            deepseek_key=os.environ.get("DEEPSEEK_API_KEY"),
            elevenlabs_key=os.environ.get("ELEVENLABS_API_KEY"),
            ollama_url=os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        )

    def list_available(self) -> Dict[str, bool]:
        """Check which APIs are available/configured."""
        return {
            "OpenAI": bool(self.config.openai_key),
            # Anthropic removed
            "Mistral": bool(self.config.mistral_key),
            "Google Gemini": bool(self.config.gemini_key),
            "DeepSeek": bool(self.config.deepseek_key),
            "ElevenLabs": bool(self.config.elevenlabs_key),
            "Ollama": True,  # Always available if running locally
        }

    def call_llm(self, prompt: str, model: str = "gpt-4") -> str:
        """Call LLM with fallback to available APIs."""
        # Try OpenAI first
        if self.config.openai_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.config.openai_key)
                response = client.chat.completions.create(
                    model=model if "gpt" in model else "gpt-4",
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI error: {e}")

        # Try Mistral
        if self.config.mistral_key:
            try:
                from mistralai import Mistral
                client = Mistral(api_key=self.config.mistral_key)
                response = client.chat.complete(
                    model="mistral-large-latest",
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"Mistral error: {e}")

        # Try Ollama (local)
        try:
            from openai import OpenAI
            client = OpenAI(base_url=self.config.ollama_url, api_key="ollama")
            response = client.chat.completions.create(
                model="llama3.1",
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Ollama error: {e}")

        return "[No LLM available - configure API key]"

    def transcribe_audio(self, audio_path: str) -> str:
        """Transcribe audio using OpenAI Whisper."""
        if not self.config.openai_key:
            return "[No API key - install openai-whisper locally]"

        from openai import OpenAI
        client = OpenAI(api_key=self.config.openai_key)

        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        return transcript.text

    def synthesize_voice(self, text: str, voice: str = "alloy") -> bytes:
        """Synthesize voice using OpenAI TTS."""
        if not self.config.openai_key:
            return b""

        from openai import OpenAI
        client = OpenAI(api_key=self.config.openai_key)

        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
        )
        return response.content


def check_apis():
    """Check all API availability."""
    client = UnifiedAPIClient()
    available = client.list_available()

    print("=" * 50)
    print("API STATUS")
    print("=" * 50)
    for api, ready in available.items():
        status = "[OK]" if ready else "[MISSING]"
        print(f"  {status} {api}")

    return available


if __name__ == "__main__":
    check_apis()
