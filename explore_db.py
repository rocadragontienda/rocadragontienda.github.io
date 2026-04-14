import paramiko

host = '79.143.88.84'
user = 'root'
pwd  = 'rot75342'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pwd, timeout=15)

def run(cmd):
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f'\n=== {cmd} ===')
    print(out or err)

# Detectar motor de BD
run('systemctl is-active mysql mariadb postgresql 2>/dev/null || true')
run('ps aux | grep -E "mysql|mariadb|postgres" | grep -v grep')
run('mysql -h 127.0.0.1 -u root -e "SHOW DATABASES;"')
run('mysql -h 127.0.0.1 -u root -D rocadrag_inventario -e "SHOW TABLES;"')

client.close()
