FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    ALLOW_DEVELOPMENT_CONTENT=false \
    HOST=0.0.0.0 \
    PORT=8000

WORKDIR /service
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY migrations ./migrations
COPY fixtures ./fixtures
RUN useradd --create-home teso
USER teso
EXPOSE 8000
ENTRYPOINT ["python"]
CMD ["-m", "app.server"]
