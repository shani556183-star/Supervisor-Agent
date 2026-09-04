@echo off
cd /d "%~dp0"
node run-supervisor.js
start "" "%~dp0reports\latest.html"
