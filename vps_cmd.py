#!/usr/bin/env python3
"""Ejecuta comandos en el VPS via paramiko sin contraseña interactiva."""
import paramiko, sys

HOST = '79.143.88.84'
USER = 'root'
PASS = 'rot75342'

def ssh(cmd, timeout=60):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASS, timeout=20)
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    c.close()
    return out + err

cmd = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'echo OK'
print(ssh(cmd))
