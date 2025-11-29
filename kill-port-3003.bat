@echo off
REM ========================================
REM @file kill-port-3003.bat
REM @description
REM 이 스크립트는 3003 포트를 사용하는 프로세스를 찾아서 종료합니다.
REM Windows 명령 프롬프트(cmd)에서 실행 가능한 배치 파일입니다.
REM
REM 사용법:
REM   1. 명령 프롬프트(cmd)를 관리자 권한으로 실행
REM   2. 이 파일이 있는 디렉토리로 이동
REM   3. kill-port-3003.bat 실행
REM
REM 동작 방식:
REM   - netstat 명령으로 3003 포트를 사용하는 프로세스의 PID를 찾습니다.
REM   - 찾은 PID를 taskkill 명령으로 강제 종료합니다.
REM
REM 유지보수:
REM   - 다른 포트를 종료하려면 "3003"을 원하는 포트 번호로 변경하세요.
REM ========================================

echo ========================================
echo 3003 포트를 사용하는 프로세스 종료 중...
echo ========================================
echo.

REM 3003 포트를 사용하는 프로세스의 PID 찾기
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3003 ^| findstr LISTENING') do (
    echo 발견된 PID: %%a
    echo 프로세스 종료 중...
    taskkill /F /PID %%a
    if errorlevel 1 (
        echo [오류] 프로세스 종료 실패. 관리자 권한으로 실행해주세요.
    ) else (
        echo [성공] 프로세스가 종료되었습니다.
    )
)

echo.
echo ========================================
echo 작업 완료
echo ========================================
pause
