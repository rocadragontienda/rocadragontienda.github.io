import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e \"SELECT username, LEFT(password_hash,10) as prefix, tipo, activo FROM usuarios LIMIT 5;\"",
    "ls /opt/rocadragon-singles/src/ /opt/rocadragon-webhook/",
    "grep -r 'bcrypt\\|argon\\|hash\\|password' /opt/rocadragon-singles/src/ 2>/dev/null | head -20",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    print(f'\n=== {cmd[:60]} ===')
    print(o.read().decode() or e.read().decode())
c.close()
