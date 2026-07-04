@echo off
REM Configure API Keys for Hood Alchemy Content Engine
REM Run this file to set all API keys

echo ============================================================
echo API CONFIGURATION
echo ============================================================

REM Set API Keys
set OPENAI_API_KEY=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
set MISTRAL_API_KEY=9micicktFjyC8ZyM7lG1H5oTi3o60buf
set OLLAMA_API_KEY=ed1b4463fa7549e3a174fa7046524f22.8A6BwoUjnSJPW4OfcFU0k3ew

REM Add Anthropic key (get from YOURDOMAIN.com)
set ANTHROPIC_API_KEY=

REM Add ElevenLabs key (get from elevenlabs.io)
set ELEVENLABS_API_KEY=

REM Add Gemini key (get from aistudio.google.com)
set GEMINI_API_KEY=

echo.
echo API Keys configured:
echo   - OpenAI: %OPENAI_API_KEY:~0,20%...
echo   - Mistral: %MISTRAL_API_KEY:~0,10%...
echo   - Anthropic: [ADD YOUR KEY]
echo   - ElevenLabs: [ADD YOUR KEY]
echo   - Gemini: [ADD YOUR KEY]
echo.
echo INSTALLED PACKAGES:
pip list | findstr /i "openai mistral google eleven"
echo.
echo ============================================================
echo Ready to run pipeline!
echo ============================================================
echo.
echo Run: set OPENAI_API_KEY=... && python test_pipeline.py ep001
echo.
pause
