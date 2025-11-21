#!/usr/bin/env python3
"""
Servidor HTTP simples para testar PWA localmente
Execute: python server.py
Acesse: http://localhost:8000
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class PWAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers para PWA
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Headers de segurança
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        
        # CORS para desenvolvimento
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        # Suporte a CORS preflight
        self.send_response(200)
        self.end_headers()
    
    def guess_type(self, path):
        # MIME types corretos para PWA
        mimetype, encoding = super().guess_type(path)
        
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html'
        elif path.endswith('.svg'):
            return 'image/svg+xml'
        elif path.endswith('.png'):
            return 'image/png'
        elif path.endswith('.jpg') or path.endswith('.jpeg'):
            return 'image/jpeg'
        elif path.endswith('.ico'):
            return 'image/x-icon'
        elif path.endswith('.woff'):
            return 'font/woff'
        elif path.endswith('.woff2'):
            return 'font/woff2'
        elif path.endswith('.ttf'):
            return 'font/ttf'
        
        return mimetype

def main():
    PORT = 8000
    
    # Verifica se a porta está disponível
    try:
        with socketserver.TCPServer(("", PORT), PWAHTTPRequestHandler) as httpd:
            print("🚀 Servidor PWA iniciado!")
            print(f"📱 Acesse: http://localhost:{PORT}")
            print(f"📱 Para mobile na mesma rede: http://{get_local_ip()}:{PORT}")
            print("🔧 Pressione Ctrl+C para parar o servidor")
            print("-" * 50)
            
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Porta {PORT} já está em uso. Tente uma porta diferente:")
            print(f"   python server.py {PORT + 1}")
        else:
            print(f"❌ Erro ao iniciar servidor: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Servidor parado pelo usuário")
        sys.exit(0)

def get_local_ip():
    """Obtém o IP local da máquina"""
    import socket
    try:
        # Conecta a um endereço externo para descobrir o IP local
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

if __name__ == "__main__":
    # Permite especificar porta como argumento
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            print("❌ Porta inválida. Use um número.")
            sys.exit(1)
    
    main()
