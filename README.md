# 🏋️‍♂️ CenterFit GymTracker PWA

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PWA](https://img.shields.io/badge/Frontend-PWA%20Offline--First-00f2fe.svg?style=flat)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CenterFit GymTracker** es una Progressive Web App (PWA) de nivel profesional, ligera y con arquitectura **Offline-First**, diseñada para el seguimiento de rutinas de fuerza, cálculo de sobrecarga progresiva, estimación de 1RM, volumen semanal de carga y gestión independiente de perfiles de usuario.

Basada en el catálogo de ejercicios oficiales de **CenterFit mx Gimnasio**.

---

## ✨ Características Principales

- **📱 PWA Móvil Instalable (iOS & Android):** Compatible con Safari "Agregar a pantalla de inicio" e instalación en Android con icono 3D neón adaptativo.
- **⚡ Arquitectura Offline-First:** Respuesta instantánea en 0ms mediante LocalStorage con sincronización asíncrona a la nube cuando hay conexión.
- **📊 Módulo de Analítica & Progreso (Chart.js):**
  - **Sobrecarga Progresiva:** Estimación del 1RM por ejercicio usando la fórmula Epley (\(1RM = W \times (1 + R/30)\)).
  - **Volumen Semanal (kg):** Acumulado de kilos levantados por semana.
  - **Récords Personales (PRs):** Medallas de peso máximo alcanzado por ejercicio.
  - **Enfoque Muscular:** Gráfica de distribución por grupo muscular (*Pierna, Pectoral, Espalda, Hombro, Bíceps, Tríceps, Abdomen*).
- **⏱️ Temporizador de Descanso Flotante (60s):** Con botones de ajuste rápido `+15s`, `-15s` y `Saltar`.
- **🔀 Reordenamiento de Ejercicios:** Control de secuencia `#1`, `#2`, `#3` con botones `▲` / `▼`.
- **➕➖ Controles Táctiles Rápidos (`-` / `+`):** Para ajuste de series, peso y repeticiones sin abrir el teclado.
- **💾 Copia de Seguridad JSON:** Exportación e importación de respaldos para no perder datos al borrar caché.
- **📦 App Autónoma Portátil:** Versión empaquetada de 1 solo archivo HTML en `standalone/gymtracker_standalone.html`.

---

## 📁 Estructura del Proyecto

```
regsitrodeGYM/
├── backend/
│   ├── app_server.py        # API FastAPI + Servidor estático
│   ├── database.py          # Configuración SQLAlchemy dual (SQLite / PostgreSQL)
│   ├── models.py            # Modelos relacionales ORM (User, Routine, WorkoutLog)
│   ├── auth.py              # Autenticación JWT y hash bcrypt
│   └── requirements.txt     # Dependencias de Python
├── frontend/
│   ├── index.html           # Interfaz principal PWA
│   ├── manifest.json        # Configuración PWA para instalación móvil
│   ├── sw.js                # Service Worker v4 (Estrategia Cache-First)
│   ├── css/
│   │   └── styles.css       # Diseño Dark Mode con Glassmorphism
│   ├── js/
│   │   ├── exercises_data.js# Catálogo de 70+ ejercicios CenterFit mx
│   │   ├── app.js           # Lógica principal, entrenamiento en vivo y perfiles
│   │   └── analytics.js     # Gráficos interactivos Chart.js
│   └── assets/              # Iconos de aplicación (PNG 180x180, 192x192, 512x512)
├── standalone/
│   ├── build_standalone.py  # Script empaquetador del HTML autónomo
│   └── gymtracker_standalone.html # App portátil de 1 archivo
├── tests/
│   └── test_api.py          # Pruebas automatizadas con Pytest
├── .gitignore
├── Procfile                 # Configuración de inicio para Railway / Render
├── main.py                  # Entrypoint seguro con parsing de puerto entero
├── vercel.json              # Configuración de despliegue en Vercel
└── README.md
```

---

## ☁️ Conexión a Base de Datos PostgreSQL / Supabase

Para conectar tu instancia en producción con **Supabase PostgreSQL**:

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **Project Settings** -> **Database**, copia la cadena de conexión en formato URI:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```
3. Configura la variable de entorno `DATABASE_URL` en tu panel de **Railway** (Variables) o en tu entorno local `.env`.
4. El backend detectará automáticamente PostgreSQL y creará las tablas usando SQLAlchemy. Si la variable no se especifica, la app funciona en modo **SQLite local** por defecto.

---

## 🧪 Pruebas Automatizadas (Testing)

El proyecto incluye pruebas automatizadas para verificar los endpoints de la API y la sincronización:

```bash
# Instalar dependencias de pruebas
python3 -m pip install -r backend/requirements.txt

# Ejecutar la suite de pruebas
pytest -v
```

---

## 🚀 Cómo Ejecutar en Local

### 1. Iniciar Servidor FastAPI
```bash
python3 main.py
```
Abre en tu navegador: `http://localhost:8000`

### 2. Generar la App Autónoma (Sin Servidor)
```bash
python3 standalone/build_standalone.py
```
Abre o envía [standalone/gymtracker_standalone.html](file:///Users/erick/Documents/Proyectos/Python/regsitrodeGYM/standalone/gymtracker_standalone.html) a tu celular. Funciona 100% offline.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
