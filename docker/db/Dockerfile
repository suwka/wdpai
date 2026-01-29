FROM postgres

ENV POSTGRES_PASSWORD docker
ENV POSTGRES_DB cats_db
ENV POSTGRES_USER docker

COPY docker/db/init.sql /docker-entrypoint-initdb.d/01_init.sql
COPY docker/db/migrations/*.sql /docker-entrypoint-initdb.d/