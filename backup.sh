#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec booking-db-primary pg_dump -U postgres booking_db > /workspaces/movie-booking/backups/booking_backup_$TIMESTAMP.sql
docker exec catalog-db-primary pg_dump -U postgres catalog_db > /workspaces/movie-booking/backups/catalog_backup_$TIMESTAMP.sql
echo "Sao luu thanh cong luc $TIMESTAMP vao thu muc backups/"
