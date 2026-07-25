# CenterFit GymTracker PWA

Aplicación web móvil ligera, responsiva e instalable (PWA) para el seguimiento de rutinas de gimnasio, conteo de repeticiones, series, peso, hora de inicio, cronómetro de descanso con alertas y perfiles de usuario independientes (**Erick** y **Pareja**).

Basada en el catálogo oficial de ejercicios de **CenterFit mx Gimnasio**.

---

## 📁 Estructura del Proyecto

```
regsitrodeGYM/
├── backend/
│   ├── app_server.py        # API FastAPI + Base de Datos SQLite (Persistencia en la Nube)
│   ├── server_https.py      # Servidor local HTTPS para desarrollo
│   └── requirements.txt     # Dependencias de Python (fastapi, uvicorn)
├── frontend/
│   ├── index.html           # Interfaz principal de la aplicación PWA
│   ├── manifest.json        # Configuración PWA para instalación móvil
│   ├── sw.js                # Service Worker para modo 100% Offline
│   ├── css/
│   │   └── styles.css       # Diseño Dark Mode premium con Glassmorphism
│   ├── js/
│   │   ├── exercises_data.js# Catálogo de ejercicios de CenterFit mx
│   │   └── app.js           # Lógica principal, temporizadores y perfiles
│   └── assets/
│       ├── icon.jpg         # Logotipo oficial
│       ├── icon-192.png     # Icono Android 192x192
│       ├── icon-512.png     # Icono Android 512x512
│       ├── apple-touch-icon.png # Icono iOS Safari 180x180
│       └── favicon.ico
├── standalone/
│   ├── build_standalone.py  # Script para compilar el HTML portátil único
│   └── gymtracker_standalone.html # App autónoma de 1 solo archivo (Sin servidor)
├── .gitignore               # Reglas de exclusión para Git
├── Procfile                 # Configuración para Railway / Render
├── vercel.json              # Configuración para Vercel
└── README.md
```

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Servidor API con SQLite en Local
```bash
python3 -m pip install -r backend/requirements.txt
python3 backend/app_server.py
```
Abre en tu navegador: `http://localhost:8000`

### 2. Generar el Archivo Portátil Único
```bash
python3 standalone/build_standalone.py
```
Abre o envía [standalone/gymtracker_standalone.html](file:///Users/erick/Documents/Proyectos/Python/regsitrodeGYM/standalone/gymtracker_standalone.html) a tu celular. Funciona 100% offline sin servidores.

---

## ☁️ Despliegue Público en la Nube

- **Railway / Render:** Conecta tu repositorio de GitHub. Se detectará automáticamente `Procfile` y `backend/requirements.txt` desplegando la API con SQLite.
- **Vercel:** Ejecuta `npx vercel` para publicar la PWA estática instantáneamente en Vercel CDN.
