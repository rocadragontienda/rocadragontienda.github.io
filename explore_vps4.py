import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "cat /opt/rocadragon-singles/src/server.ts",
    "cat /opt/rocadragon-webhook/src/server.ts 2>&1 || cat /opt/rocadragon-webhook/index.js 2>&1 || ls /opt/rocadragon-webhook/",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
