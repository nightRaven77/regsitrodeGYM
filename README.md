# 🏋️‍♂️ CenterFit GymTracker PWA

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PWA](https://img.shields.io/badge/Frontend-PWA%20Offline--First-00f2fe.svg?style=flat)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CenterFit GymTracker** es una Progressive Web App (PWA) de nivel profesional, ligera y con arquitectura **Offline-First**, diseñada para el seguimiento de rutinas de fuerza, cálculo de sobrecarga progresiva, estimación de 1RM, volumen semanal de carga y guía visual técnica animada de ejercicios.

Basada en el catálogo de ejercicios oficiales de **CenterFit mx Gimnasio**.

---

## ✨ Características Principales

- **👁️ Guía Visual Animada de Ejercicios (302 Ejercicios):**
  - Reproductor interactivo en bucle de 3 cuadros (*frames*) a 500 ms en formato SVG vectorial transparente (512×512 píxeles).
  - Controles manuales de Pausa/Reproducir, Cuadro Anterior ⏮️, Cuadro Siguiente ⏭️ e indicadores numéricos.
  - Mapeo de músculos objetivo principales y secundarios con badges de neón.
  - **Sustitución de Ejercicios Alternativos:** Cambio fluido con 1 solo clic a variantes o ejercicios relacionados desde la misma interfaz.
- **📱 PWA Móvil Instalable (iOS & Android):** Compatible con Safari "Agregar a pantalla de inicio" e instalación en Android con icono 3D neón adaptativo y soporte offline.
- **⚡ Arquitectura Offline-First:** Respuesta instantánea en 0ms mediante LocalStorage y caché de imágenes SVG con sincronización asíncrona a la nube cuando hay conexión.
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
│   ├── database.py          # Configuración SQLAlchemy dual (SQLite / PostgreSQL)
│   ├── models.py            # Modelos relacionales ORM (User, Routine, WorkoutLog)
│   ├── repository.py        # Capa de repositorios y persistencia
│   └── auth.py              # Autenticación JWT y hash bcrypt
├── frontend/
│   ├── index.html           # Interfaz principal PWA y modal de Guía Visual
│   ├── manifest.json        # Configuración PWA para instalación móvil
│   ├── sw.js                # Service Worker v8 (Caché de SVGs y Offline PWA)
│   ├── css/
│   │   └── styles.css       # Diseño Dark Mode con Glassmorphism y reproductor SVG
│   ├── js/
│   │   ├── exercises_data.js# Catálogo de 80 ejercicios base + 302 de la guía visual
│   │   ├── app.js           # Lógica principal, reproductor de guía y perfiles
│   │   └── analytics.js     # Gráficos interactivos Chart.js
│   └── assets/
│       ├── exercises/       # 906 ilustraciones SVG (302 ejercicios x 3 cuadros)
│       └── exercises_manifest.json # Metadatos de la guía visual
├── scripts/
│   └── copy_workout_assets.py # Extracción y migración de assets desde workout-guide
├── standalone/
│   ├── build_standalone.py  # Script empaquetador del HTML autónomo
│   └── gymtracker_standalone.html # App portátil de 1 archivo
├── tests/
│   └── test_api.py          # Pruebas automatizadas con Pytest
├── .gitignore
├── app_server.py            # Servidor API FastAPI + archivos estáticos
├── main.py                  # Entrypoint seguro con parsing de puerto entero
├── requirements.txt         # Dependencias de Python
└── README.md
```

---

## 🎨 Atribución de Assets Visuales

Las ilustraciones vectoriales técnicas provienen del proyecto libre [`workout-guide`](https://github.com/bryllim/workout-guide.git) (Bryl Lim) y la colección original de **Everkinetic**, distribuidas bajo la licencia **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**.

---

## ☁️ Conexión a Base de Datos PostgreSQL / Supabase

Para conectar tu instancia en producción con **Supabase PostgreSQL**:

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **Project Settings** -> **Database**, copia la cadena de conexión en formato URI:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   ```
3. Configura la variable de entorno `DATABASE_URL` en tu panel de hosting (Railway / Render / Vercel) o en tu entorno local.
4. El backend detectará automáticamente PostgreSQL y creará las tablas usando SQLAlchemy. Si no se especifica, la app funciona en modo **SQLite local** por defecto.

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
