"""
Deploy del Dashboard API al VPS 79.143.88.84
Sube server.js + package.json, instala deps y arranca con PM2
"""
import paramiko
import io

HOST     = '79.143.88.84'
USER     = 'root'
PASSWORD = 'rot75342'
REMOTE   = '/opt/rocadragon-dashboard'

ENV_CONTENT = (
    "DB_HOST=127.0.0.1\n"
    "DB_PORT=3306\n"
    "DB_USER=rocadrag_app\n"
    "DB_PASSWORD=rot75342\n"
    "DB_NAME=rocadrag_inventario\n"
    "DASHBOARD_PORT=3001\n"
)

LOCAL_FILES = {
    'server.js':   'backend-api/server.js',
    'package.json': 'backend-api/package.json',
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
print('SSH conectado ✅')

sftp = client.open_sftp()

# Crear directorio
stdin, stdout, stderr = client.exec_command(f'mkdir -p {REMOTE}')
stdout.channel.recv_exit_status()

# Subir archivos
for remote_name, local_path in LOCAL_FILES.items():
    sftp.put(local_path, f'{REMOTE}/{remote_name}')
    print(f'  ↑ {remote_name}')

# Escribir .env
with sftp.open(f'{REMOTE}/.env', 'w') as f:
    f.write(ENV_CONTENT)
print('  ↑ .env')

sftp.close()

def run(cmd, label=''):
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=False)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if label:
        print(f'\n── {label} ──')
    if out: print(out)
    if err: print('[stderr]', err)

# npm install
run(f'cd {REMOTE} && npm install --omit=dev 2>&1', 'npm install')

# Abrir puerto 3001 en firewall
run(
    'firewall-cmd --add-port=3001/tcp --permanent 2>&1 && firewall-cmd --reload 2>&1'
    ' || iptables -C INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null'
    ' || iptables -I INPUT -p tcp --dport 3001 -j ACCEPT',
    'Firewall puerto 3001'
)

# PM2: eliminar instancia anterior si existe y arrancar
run(f'pm2 delete rocadragon-dashboard 2>/dev/null; echo ok', 'PM2 stop anterior')
run(
    f'cd {REMOTE} && pm2 start server.js --name rocadragon-dashboard && pm2 save',
    'PM2 start'
)
run('pm2 list', 'Estado PM2')

# Verificar health
import time
time.sleep(2)
run('curl -sf http://localhost:3001/api/health 2>&1 || echo "(health no responde aun)"', 'Health check')

client.close()
print('\nDeploy completado ✅')
