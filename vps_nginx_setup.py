#!/usr/bin/env python3
"""Escribe la config de nginx y la recarga en el VPS via paramiko."""
import paramiko

HOST = '79.143.88.84'
USER = 'root'
PASS = 'rot75342'

NGINX_CONF = r"""upstream dashboard {
    server 127.0.0.1:3000;
    keepalive 32;
}
upstream webhook {
    server 127.0.0.1:3001;
    keepalive 8;
}
server {
    listen 80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://dashboard;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate     /etc/ssl/rocadragon/fullchain.pem;
    ssl_certificate_key /etc/ssl/rocadragon/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    location /api/webhooks {
        proxy_pass http://webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    location / {
        proxy_pass http://dashboard;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

def ssh_run(client, cmd, timeout=30):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASS, timeout=20)

# Escribir el archivo via SFTP
sftp = c.open_sftp()
with sftp.open('/etc/nginx/conf.d/rocadragon.conf', 'w') as f:
    f.write(NGINX_CONF)
sftp.close()
print('Config escrita via SFTP')

# Test y reload
print(ssh_run(c, 'nginx -t 2>&1'))
print(ssh_run(c, 'nginx -s reload 2>&1'))
import time; time.sleep(2)
print(ssh_run(c, "ss -tlnp | grep -E ':80|:443'"))
print(ssh_run(c, "curl -sk https://127.0.0.1/api/health && echo HTTPS_OK || echo HTTPS_FAIL"))

c.close()
