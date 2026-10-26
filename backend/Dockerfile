FROM python:alpine

WORKDIR /app

# Install build dependencies for C-extensions and uv
RUN apk add --no-cache gcc musl-dev linux-headers libffi-dev g++ curl

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy dependency definition
COPY pyproject.toml .

# Install dependencies using uv into system python
RUN uv pip install --system -r pyproject.toml

# Copy application code and pre-seeded January 2026 Elexon database
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
