FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente completo
COPY . .

# Configurar variable de entorno para rutas de Python
ENV PYTHONPATH=/app

# Exponer puerto por defecto
EXPOSE 8000

# Ejecutar la app a través del punto de entrada principal main:app
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
