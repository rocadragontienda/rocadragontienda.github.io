import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('79.143.88.84', username='root', password='rot75342', timeout=15)

cmds = [
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT DISTINCT sucursal FROM ventas ORDER BY sucursal;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT sucursal, COUNT(*) as ventas, SUM(total) as total_ventas FROM ventas GROUP BY sucursal;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'DESCRIBE productos;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT id, nombre, sucursal FROM productos LIMIT 5;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'SELECT DATE(creado_en) as fecha, sucursal, COUNT(*) as num_ventas, SUM(total) as total FROM ventas GROUP BY DATE(creado_en), sucursal LIMIT 20;' 2>&1",
    "mysql -u rocadrag_app -prot75342 -h 127.0.0.1 rocadrag_inventario -e 'DESCRIBE usuarios;' 2>&1",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(f"\n=== {cmd[:70]} ===")
    print(out or err or "(sin salida)")

client.close()
