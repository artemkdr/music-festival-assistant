@echo off
echo Starting JSON to PostgreSQL migration...
echo.
echo Prerequisites:
echo - DATABASE_URL must be set in .env.local
echo - JSON data files must exist in data/ directory
echo.
pause
echo.
echo Running migration...
npm run migrate-to-postgres
echo.
if %ERRORLEVEL% EQU 0 (
    echo ✅ Migration completed successfully!
) else (
    echo ❌ Migration failed with error code %ERRORLEVEL%
)
echo.
pause
