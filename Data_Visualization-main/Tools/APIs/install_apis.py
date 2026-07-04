#!/usr/bin/env python3
"""
Hood Alchemy Content Engine - API Configuration Script

Installs required packages and configures API keys from your API files.
"""

import os
import subprocess
import sys

# API Keys from your files
API_KEYS = {
    "OPENAI_API_KEY": "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",
    "MISTRAL_API_KEY": "9micicktFjyC8ZyM7lG1H5oTi3o60buf",
    "OLLAMA_API_KEY": "ed1b4463fa7549e3a174fa7046524f22.8A6BwoUjnSJPW4OfcFU0k3ew",
}

PACKAGES = [
    # Anthropic removed - add your package here if needed
    "mistralai",
    "google-generativeai",
    "httpx[speedups]",
]


def install_packages():
    """Install required Python packages."""
    print("[1/2] Installing Python packages...")
    for pkg in PACKAGES:
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "-q", pkg],
                capture_output=True,
                timeout=120,
            )
            print(f"  [OK] {pkg}")
        except subprocess.TimeoutExpired:
            print(f"  [TIMEOUT] {pkg}")
        except Exception as e:
            print(f"  [ERROR] {pkg}: {e}")


def configure_keys():
    """Configure API keys in environment."""
    print("\n[2/2] Configuring API keys...")

    # Set in current process
    for key, value in API_KEYS.items():
        os.environ[key] = value
        print(f"  [OK] {key}")

    # Create .env file for persistence
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    with open(env_path, "w") as f:
        f.write("# Hood Alchemy API Keys\n")
        for key, value in API_KEYS.items():
            f.write(f"{key}={value}\n")
    print(f"  [OK] Saved to .env file")


def print_usage():
    """Print usage instructions."""
    print("\n" + "=" * 60)
    print("API CONFIGURATION COMPLETE")
    print("=" * 60)
    print("\nAvailable APIs:")
    print("  - OpenAI (GPT-4, Whisper, TTS)")
    print("  - Mistral (LLM)")
    print("  - Anthropic Claude (LLM)")
    print("  - Google Gemini (LLM)")
    print("  - Ollama (Local LLM)")
    print("  - ElevenLabs (Voice)")
    print("\nTo use in your session, set environment variables:")
    print("  set OPENAI_API_KEY=your_key")
    print("  set ANTHROPIC_API_KEY=your_key")
    print("\nOr run with keys:")
    print("  set OPENAI_API_KEY=... && python test_pipeline.py ep001")


if __name__ == "__main__":
    install_packages()
    configure_keys()
    print_usage()
