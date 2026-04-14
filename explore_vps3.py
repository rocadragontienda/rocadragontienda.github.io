import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "ls -la /opt/rocadragon-singles/",
    "ls -la /opt/rocadragon-mtgjson/",
    "cat /opt/rocadragon-mtgjson/.env",
    "cat /opt/rocadragon-webhook/.env",
    "cat /opt/rocadragon-singles/.env 2>&1",
    # Ver package.json para entender la app
    "cat /opt/rocadragon-singles/package.json 2>&1 | head -30",
    "cat /opt/rocadragon-mtgjson/package.json 2>&1 | head -30",
    # Buscar archivos de config de BD
    "find /opt -name '*.js' -o -name '*.ts' | xargs grep -l 'rocadrag_inventario' 2>/dev/null | head -10",
    "find /opt -name '*.js' -o -name '*.ts' | xargs grep -l 'sequelize\\|knex\\|mysql\\|pg\\|sqlite' 2>/dev/null | head -10",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
