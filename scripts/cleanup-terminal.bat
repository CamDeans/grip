@echo off
echo Starting terminal cleanup...

REM Files to remove
set "files_to_remove=src\components\terminal\Terminal.module.css src\components\terminal\TerminalWrapper.tsx src\components\terminal\GuidedTerminalWrapper.module.css src\lib\config\terminal.ts src\lib\services\GuidedTerminal.ts src\lib\workers\terminal.worker.ts"

REM Remove files
for %%f in (%files_to_remove%) do (
    if exist "%%f" (
        del "%%f"
        echo Removed: %%f
    )
)

REM Remove terminal-related dependencies
npm uninstall xterm xterm-addon-fit xterm-addon-web-links bufferutil utf-8-validate ws

REM Clean up terminal references in TypeScript and CSS files
powershell -Command "Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.css | ForEach-Object { (Get-Content $_.FullName) -replace 'terminal', '' | Set-Content $_.FullName }"

echo Terminal cleanup complete. 