"""
deploy_full.py — Sube el dashboard completo al VPS
  1. Compila el frontend (npm run build)
  2. Sube los archivos dist/ al VPS como /opt/rocadragon-dashboard/public/
  3. Actualiza server.js (sirve estáticos + API)
  4. Cambia el puerto a 80
  5. Reinicia PM2
"""
import paramiko, subprocess, os, sys, posixpath

HOST     = '79.143.88.84'
USER     = 'root'
PASSWORD = 'rot75342'
REMOTE   = '/opt/rocadragon-dashboard'
LOCAL_DIST = os.path.join(os.path.dirname(__file__), 'dist')

ENV_CONTENT = (
    "DB_HOST=127.0.0.1\n"
    "DB_PORT=3306\n"
    "DB_USER=rocadrag_app\n"
    "DB_PASSWORD=rot75342\n"
    "DB_NAME=rocadrag_inventario\n"
    "DASHBOARD_PORT=3000\n"
)

# ── 1. Build local ─────────────────────────────────────────────────────────
print('▶ Build frontend...')
result = subprocess.run(['npm', 'run', 'build'], cwd=os.path.dirname(__file__), shell=True)
if result.returncode != 0:
    print('✗ Build falló'); sys.exit(1)
print('✓ Build completado')

# ── 2. Conectar SSH ────────────────────────────────────────────────────────
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASSWORD, timeout=20)
print('✓ SSH conectado')
sftp = client.open_sftp()

def run(cmd, label=''):
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=False)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if label: print(f'\n── {label}')
    if out: print(out)
    if err and 'warn' not in err.lower(): print('[err]', err[:300])
    return out

# ── 3. Crear estructura de directorios ─────────────────────────────────────
run(f'rm -rf {REMOTE}/public && mkdir -p {REMOTE}/public')

# ── 4. Subir server.js y .env actualizados ─────────────────────────────────
server_local = os.path.join(os.path.dirname(__file__), 'backend-api', 'server.js')
sftp.put(server_local, f'{REMOTE}/server.js')
print('↑ server.js')

admin_local = os.path.join(os.path.dirname(__file__), 'backend-api', 'admin.js')
sftp.put(admin_local, f'{REMOTE}/admin.js')
print('↑ admin.js')

with sftp.open(f'{REMOTE}/.env', 'w') as f:
    f.write(ENV_CONTENT)
print('↑ .env (puerto 3000)')

# ── 5. Subir dist/ → remote public/ ───────────────────────────────────────
def upload_dir(local_dir, remote_dir):
    count = 0
    for root, dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace('\\', '/')
        remote_root = remote_dir if rel == '.' else posixpath.join(remote_dir, rel)
        try: sftp.mkdir(remote_root)
        except: pass
        for fname in files:
            sftp.put(os.path.join(root, fname), posixpath.join(remote_root, fname))
            count += 1
    return count

print('↑ Subiendo dist/ ...')
n = upload_dir(LOCAL_DIST, f'{REMOTE}/public')
print(f'  {n} archivos subidos a {REMOTE}/public/')

sftp.close()

# ── 6. Reiniciar PM2 ──────────────────────────────────────────────────────
run(f'cd {REMOTE} && pm2 restart rocadragon-dashboard --update-env && pm2 save', 'PM2 restart')

import time; time.sleep(2)

# ── 7. Recargar nginx ─────────────────────────────────────────────────────
run('nginx -s reload 2>&1 || true', 'nginx reload')

# ── 8. Verificar ───────────────────────────────────────────────────────────
run('curl -sf http://localhost:3000/api/health 2>&1 || echo "sin respuesta"', 'Health check')
run('pm2 list', 'Estado PM2')

client.close()
print('\n✅ Dashboard en http://79.143.88.84/ y https://79.143.88.84/')
