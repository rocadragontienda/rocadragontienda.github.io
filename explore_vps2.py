import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    # Qué servicios corren
    "systemctl list-units --type=service --state=running 2>&1 | head -40",
    # Puertos abiertos
    "ss -tlnp 2>&1",
    # Buscar archivos de BD SQLite
    "find / -maxdepth 8 -name '*.sqlite' -o -name '*.db' 2>/dev/null | head -30",
    # Ver estructura de directorios raíz
    "ls -la /",
    "ls -la /root/ 2>&1",
    "ls -la /srv/ /opt/ /app/ /data/ 2>/dev/null",
    # Buscar archivos PHP/Python/Node con config de BD
    "find / -maxdepth 6 -name '*.env' -o -name 'config.php' -o -name 'database.php' 2>/dev/null | head -20",
    # Ver si hay docker
    "docker ps 2>&1 | head -20",
    "docker network ls 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
