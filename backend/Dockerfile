# Use Python 3.10 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Northflank usa variável PORT)
EXPOSE 8000

# Command to run FastAPI with uvicorn
# Northflank injeta PORT como variável de ambiente
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
