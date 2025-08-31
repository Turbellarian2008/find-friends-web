#!/bin/bash

# Create backup directory if it doesn't exist
mkdir -p db_backup

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Backup existing local database if it exists
if [ -f local.db ]; then
    echo "Backing up existing local database..."
    cp local.db "db_backup/local-backup-$TIMESTAMP.db"
fi

# Remove existing database
rm -f local.db

# Create new database with schema
echo "Creating new database with schema..."
sqlite3 local.db < database/schema.sql

# Export remote database to a temporary file
echo "Exporting remote database..."
TEMP_FILE="db_backup/temp_remote_export.sql"
wrangler d1 export find-friends-db --remote --output="$TEMP_FILE"

# Import data (skipping schema creation)
echo "Importing data..."
sed -i '' -e '/^CREATE TABLE/ d' -e '/^CREATE INDEX/ d' -e '/^CREATE UNIQUE INDEX/ d' "$TEMP_FILE"
sqlite3 local.db < "$TEMP_FILE"

# Clean up
rm -f "$TEMP_FILE"

echo "Database import completed successfully!"
echo "Local database is now synchronized with the remote database."
echo "A backup of the previous local database is available at: db_backup/local-backup-$TIMESTAMP.db"
