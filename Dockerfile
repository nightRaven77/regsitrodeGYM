FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el proyecto
COPY . .

# Exponer puerto por defecto
EXPOSE 8000

# Ejecutar la aplicación con python3 main.py para procesar el puerto dinámico de Railway de forma segura
CMD ["python3", "main.py"]
