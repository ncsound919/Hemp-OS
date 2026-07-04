@echo off
echo ============================================================================
echo Starting Digital Lab API Server
echo ============================================================================
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
echo Access points:
echo   - API Documentation: http://localhost:8000/docs
echo   - Health Check:      http://localhost:8000/health
echo   - System Info:       http://localhost:8000/api/v1/system/info
echo.
echo ============================================================================
echo.

python simple_api.py

pause
