import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "systemctl is-active mariadb mysql postgresql 2>&1",
    "mysql -u root -e 'SHOW DATABASES;' -h 127.0.0.1 -P 3306 2>&1",
    "mysql -u root -e 'USE rocadrag_inventario; SHOW TABLES;' -h 127.0.0.1 2>&1",
    "ss -tlnp | grep -E '3306|5432|27017'",
    "ls /var/www/ 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:60]} ===")
    print(out or err or "(sin salida)")

client.close()
