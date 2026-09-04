@echo off
cd /d "%~dp0"
node run-supervisor.js >> "%~dp0reports\run.log" 2>&1
