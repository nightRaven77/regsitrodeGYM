FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el proyecto
COPY . .

# Exponer puerto por defecto
EXPOSE 8000

# Ejecutar Uvicorn usando app_server:app a nivel raíz
CMD ["sh", "-c", "uvicorn app_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
