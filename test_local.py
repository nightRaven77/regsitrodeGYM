import os
import sys
import json
import urllib.request

print("==================================================")
print("🧪 VERIFICACIÓN DE PRUEBA LOCAL - CENTERFIT GYMTRACKER")
print("==================================================")

# 1. Check HTML files
frontend_html = os.path.join(os.path.dirname(__file__), 'frontend', 'index.html')
standalone_html = os.path.join(os.path.dirname(__file__), 'standalone', 'gymtracker_standalone.html')

print(f"\n1. Verificando archivos HTML...")
if os.path.exists(frontend_html):
    print(f"  ✅ Frontend HTML: Encontrado ({os.path.getsize(frontend_html)} bytes)")
else:
    print(f"  ❌ Frontend HTML: No encontrado")

if os.path.exists(standalone_html):
    print(f"  ✅ Standalone HTML autónomo: Encontrado ({os.path.getsize(standalone_html)} bytes)")
else:
    print(f"  ❌ Standalone HTML: No encontrado")

# 2. Check JavaScript & Analytics Modules
print(f"\n2. Verificando módulos JS y Analítica...")
analytics_js = os.path.join(os.path.dirname(__file__), 'frontend', 'js', 'analytics.js')
if os.path.exists(analytics_js):
    print(f"  ✅ Módulo de Analítica (analytics.js): Encontrado ({os.path.getsize(analytics_js)} bytes)")
else:
    print(f"  ❌ Módulo de Analítica: No encontrado")

# 3. Test API connection if server is running on port 8000
print(f"\n3. Probando Servidor API en http://localhost:8000 ...")
try:
    req = urllib.request.urlopen("http://localhost:8000/api/health", timeout=2)
    data = json.loads(req.read().decode('utf-8'))
    print(f"  ✅ Respuesta API Health Check: {data}")
except Exception as e:
    print(f"  ℹ️ Servidor en local no iniciado aún (ejecuta 'python3 main.py' para probar la API).")

print("\n==================================================")
print("💡 Opciones para Probar en Local:")
print("  Option A (Modo Standalone Portátil): Abre 'standalone/gymtracker_standalone.html' directamente en tu navegador Safari/Chrome.")
print("  Option B (Servidor API Local): Ejecuta 'python3 main.py' en tu terminal y abre 'http://localhost:8000'.")
print("==================================================")
