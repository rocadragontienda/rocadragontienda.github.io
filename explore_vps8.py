import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

# Restart MariaDB
stdin, stdout, stderr = client.exec_command("systemctl start mariadb 2>&1; sleep 4; systemctl is-active mariadb")
print("Start:", stdout.read().decode(), stderr.read().decode())

time.sleep(5)

cmds = [
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SHOW TABLES;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'DESCRIBE ventas;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'DESCRIBE ventas_items;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT COUNT(*) FROM ventas;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT * FROM ventas LIMIT 3\\G' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SHOW CREATE TABLE ventas\\G' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SHOW CREATE TABLE ventas_items\\G' 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
