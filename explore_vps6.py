import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "cat /opt/rocadragon-webhook/server.js | head -200",
    "cat /opt/rocadragon-webhook/describe-ventas.js",
    # MySQL status and tables via socket  
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SHOW TABLES;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema=\"rocadrag_inventario\";' 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
