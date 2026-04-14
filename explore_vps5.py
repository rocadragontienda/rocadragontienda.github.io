import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "ls -la /opt/rocadragon-webhook/",
    "cat /opt/rocadragon-webhook/src/server.ts 2>&1 || find /opt/rocadragon-webhook -name '*.ts' -o -name '*.js' | grep -v node_modules | head -10",
    "cat /opt/rocadragon-mtgjson/src/server.ts",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
