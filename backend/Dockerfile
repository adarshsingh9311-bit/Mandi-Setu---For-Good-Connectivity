FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
RUN useradd --create-home mandisetu && mkdir /data && chown mandisetu /data
USER mandisetu
ENV KISANSETU_DB_PATH=/data/kisansetu.sqlite3
ENV MANDISETU_JOBS_ENABLED=1
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
