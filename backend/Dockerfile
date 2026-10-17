# Yaadon ki Baithak API. Runs as-is on Hugging Face Spaces (Docker SDK),
# Render, Railway, Koyeb or any container host. The port comes from $PORT
# (Render/Railway set it); Hugging Face Spaces expects 7860, the default.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=7860 TRUSTED_PROXY_HOPS=1

# Hugging Face Spaces runs containers as uid 1000.
RUN useradd --create-home --uid 1000 app
WORKDIR /home/app/backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app agents ./agents
COPY --chown=app:app app ./app

USER app
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --no-proxy-headers"]
