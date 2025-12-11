FROM python:3.11-slim

WORKDIR /app

# Installazione dipendenze di sistema (necessarie per buildare alcune lib python)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia e installazione requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia i file di Alembic nella WORKDIR del container
COPY ../alembic.ini .
COPY ../alembic ./alembic

# Copia del codice sorgente dell'app
COPY . .

# Comando di avvio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
