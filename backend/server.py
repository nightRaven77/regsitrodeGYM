import http.server
import ssl
import socket

PORT = 8443

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

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_https_server():
    ip = get_ip()
    server_address = ('0.0.0.0', PORT)
    httpd = http.server.HTTPServer(server_address, QuietHandler)

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile='cert.pem', keyfile='key.pem')
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

    print(f"\n=======================================================")
    print(f"🔒 Servidor HTTPS de GymTracker iniciado!")
    print(f"📱 En tu iPhone / Android abre: https://{ip}:{PORT}")
    print(f"💻 En tu computadora abre:    https://localhost:{PORT}")
    print(f"=======================================================\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")

if __name__ == '__main__':
    run_https_server()
