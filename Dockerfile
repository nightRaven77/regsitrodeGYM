FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema si son necesarias
RUN apt-get update && apt-get install -y --no-install-recommends build-essential

# Copiar e instalar los requerimientos de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Comando para iniciar la aplicación usando la variable de entorno PORT de Railway
CMD uvicorn backend.app_server:app --host 0.0.0.0 --port ${PORT:-8000}
