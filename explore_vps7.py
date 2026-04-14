import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    # Ver todos los puertos escuchando 
    "ss -tlnp",
    # Ver si mysqld está corriendo de alguna forma
    "ps aux | grep -i mysql",
    # Ver el log de MySQL/MariaDB
    "journalctl -u mariadb --no-pager -n 30 2>&1",
    "journalctl -u mysqld --no-pager -n 30 2>&1",
    # Intentar ejecutar describe-ventas para ver la estructura de la tabla
    "cd /opt/rocadragon-webhook && node describe-ventas.js 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
