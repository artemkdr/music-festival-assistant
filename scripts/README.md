# Migration Script Documentation

## JSON to PostgreSQL Migration

This script migrates data from local JSON files to a Neon PostgreSQL database.

### Prerequisites

1. **Environment Variables**: Ensure your `.env.local` file contains:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   ```

2. **JSON Data Files**: The following files must exist:
   - `data/artists/artists.json`
   - `data/festivals/festivals.json`

### Usage

#### Option 1: Using npm script (Recommended)
```bash
npm run migrate-to-postgres
```

#### Option 2: Direct execution
```bash
# TypeScript version
tsx scripts/migrate-to-postgres.ts

# JavaScript ES module version
node scripts/migrate-to-postgres.mjs
```

### Features

- **Automatic Table Creation**: Creates tables if they don't exist
- **Optimized Indexes**: Adds performance indexes for common queries
- **Upsert Logic**: Updates existing records or creates new ones
- **Progress Reporting**: Shows progress every 100 artists / 50 festivals
- **Error Handling**: Continues processing even if individual records fail
- **Comprehensive Logging**: Detailed logs of the migration process
- **Migration Summary**: Final report with statistics

### Migration Process

1. **Validation**: Checks environment variables and file existence
2. **Repository Initialization**: Sets up database tables and indexes
3. **Artists Migration**: 
   - Generates IDs for artists without them
   - Validates against Artist schema
   - Batch processes with progress reporting
4. **Festivals Migration**:
   - Validates against Festival schema
   - Handles lineup data as JSONB
5. **Summary Report**: Shows success rates and any errors

### Database Schema

#### Artists Table
```sql
CREATE TABLE artists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    genre JSONB,
    description TEXT,
    image_url VARCHAR(1000),
    mapping_ids JSONB,
    streaming_links JSONB,
    social_links JSONB,
    sources JSONB,
    popularity JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Festivals Table
```sql
CREATE TABLE festivals (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    website VARCHAR(1000),
    image_url VARCHAR(1000),
    lineup JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Error Handling

- **Individual Record Failures**: Logged and skipped, migration continues
- **File Access Errors**: Migration stops with clear error message
- **Database Connection Errors**: Migration stops with connection details
- **Schema Validation Errors**: Individual records skipped with details

### Performance Optimizations

- **Batch Processing**: Progress reporting to avoid memory issues
- **Caching**: Repository caching enabled for faster lookups
- **Indexes**: Automatic creation of performance indexes
- **JSONB**: Efficient storage and querying of JSON data

### Sample Output

```
🚀 Starting JSON to PostgreSQL migration...
Artists file found: /path/to/data/artists/artists.json
Festivals file found: /path/to/data/festivals/festivals.json
Starting artists migration...
Found 5000 artists to migrate
Processed 100/5000 artists
...
✅ Migration completed successfully in 45.2s

============================================================
MIGRATION SUMMARY
============================================================
Artists:
  📊 Processed: 5000
  ✅ Created: 4850
  🔄 Updated: 150
  ⚠️  Skipped: 0

Festivals:
  📊 Processed: 150
  ✅ Created: 145
  🔄 Updated: 5
  ⚠️  Skipped: 0

Migration completed with 100.00% success rate
============================================================
```

### Troubleshooting

1. **DATABASE_URL not found**: Check your `.env.local` file
2. **JSON files not found**: Ensure data files exist in correct locations
3. **Connection timeout**: Check your database connection and network
4. **Permission errors**: Ensure database user has CREATE TABLE permissions
5. **Memory issues**: For very large datasets, consider running in smaller batches

### Safety Features

- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Only inserts or updates, never deletes existing data
- **Transaction-safe**: Each operation is properly handled
- **Rollback capability**: Failed operations don't affect successful ones
