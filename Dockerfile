FROM python:3.10-slim

WORKDIR /app

# Copiar el requirements.txt desde la carpeta backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el resto del código del repositorio
COPY . .

# Comando de ejecución
CMD uvicorn backend.app_server:app --host 0.0.0.0 --port ${PORT:-8000}
