import http.server
import ssl
import socket
import os
import subprocess

PORT = 8443
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
CERT_FILE = os.path.join(BASE_DIR, "cert.pem")
KEY_FILE = os.path.join(BASE_DIR, "key.pem")

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def generate_cert():
    if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
        print("🔑 Generando certificado SSL para HTTPS local...")
        cmd = f'openssl req -x509 -newkey rsa:2048 -keyout "{KEY_FILE}" -out "{CERT_FILE}" -days 365 -nodes -subj "/CN=localhost"'
        try:
            subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print("✅ Certificados SSL generados en backend/")
            return True
        except Exception as e:
            print(f"⚠️ No se pudo generar el certificado SSL automáticamente: {e}")
            return False
    return True

class FrontendHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        pass

def run_server():
    ip = get_ip()
    has_ssl = generate_cert()

    server_address = ('0.0.0.0', PORT)
    httpd = http.server.HTTPServer(server_address, FrontendHandler)

    if has_ssl and os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE):
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
        protocol = "https"
    else:
        protocol = "http"

    print(f"\n=======================================================")
    print(f"🚀 Servidor local GymTracker iniciado!")
    print(f"📱 En tu iPhone / Android abre: {protocol}://{ip}:{PORT}")
    print(f"💻 En tu computadora abre:    {protocol}://localhost:{PORT}")
    print(f"=======================================================\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")

if __name__ == '__main__':
    run_server()
