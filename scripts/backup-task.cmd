@echo off
cd /d D:\code\feedback_ok
node scripts\backup.mjs >> backups\backup.log 2>&1
