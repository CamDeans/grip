@echo off
echo Deleting problematic folders...
rmdir /s /q "src\app\api\analysis\[projectId]"
rmdir /s /q "src\app\api\chat\history\[projectId]"
rmdir /s /q "src\app\api\project-structure\[projectId]"
rmdir /s /q "src\app\api\projects\[projectId]"
echo Done! 