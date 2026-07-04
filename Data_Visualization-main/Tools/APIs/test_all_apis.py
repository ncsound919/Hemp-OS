#!/usr/bin/env python3
"""Test all installed API clients."""
import os
from pathlib import Path

# Set API keys from your files
os.environ["OPENAI_API_KEY"] = "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"
os.environ["ANTHROPIC_API_KEY"] = ""  # Add your key
os.environ["MISTRAL_API_KEY"] = "9micicktFjyC8ZyM7lG1H5oTi3o60buf"
os.environ["ELEVENLABS_API_KEY"] = ""  # Add your key

# Add APIs folder to path
import sys
sys.path.insert(0, str(Path(__file__).parent / "APIs"))

from unified_api_client import UnifiedAPIClient, check_apis

print("=" * 60)
print("HOOD ALCHEMY - API STATUS")
print("=" * 60)

# Check APIs
check_apis()

print("\n" + "=" * 60)
print("TESTING LLM CALL")
print("=" * 60)

client = UnifiedAPIClient()
response = client.call_llm("Say 'API is working!' in 5 words or less")
print(f"\nLLM Response: {response}")

print("\n" + "=" * 60)
print("READY TO USE!")
print("=" * 60)
