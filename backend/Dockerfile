FROM python:3.11-slim

# Prevent Python from buffering logs
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Render injects PORT automatically
ENV PORT=10000

EXPOSE ${PORT}

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"