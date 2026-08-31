#!/usr/bin/env python3
"""
Utility script to import any .sql file directly into the Aiven Cloud MySQL database.
Does NOT require mysql.exe installed on Windows!
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv
import pymysql

# Load environment variables
load_dotenv(Path(__file__).parent / '.env.production')
load_dotenv(Path(__file__).parent / '.env')

def import_sql_file(file_path):
    target_path = Path(file_path)
    if not target_path.exists():
        print(f"Error: SQL file not found at {target_path}")
        return False

    print(f"Reading SQL file: {target_path.name}...")
    with open(target_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Database configuration from environment
    host = os.getenv('DB_HOST', 'localhost')
    port = int(os.getenv('DB_PORT', 3306))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'wqms_db')

    print(f"Connecting to Aiven MySQL ({host}:{port}/{database})...")
    
    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            autocommit=True,
            ssl={'ssl': True}
        )

        with connection.cursor() as cursor:
            # Disable foreign key checks during import for safety
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            statements = sql_content.split(';')
            executed_count = 0
            
            for statement in statements:
                statement = statement.strip()
                # Skip comments or empty lines
                if not statement or statement.startswith('--') or statement.startswith('/*'):
                    continue
                # Skip CREATE DATABASE or USE statements for cloud databases
                if 'CREATE DATABASE' in statement.upper() or 'USE ' in statement.upper():
                    continue

                try:
                    cursor.execute(statement)
                    executed_count += 1
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.upper().split('CREATE TABLE')[1].split('(')[0].strip().replace('`', '').replace('IF NOT EXISTS', '').strip()
                        print(f"  [OK] Table created: {table_name}")
                except Exception as stmt_err:
                    print(f"  [Notice] Statement: {stmt_err}")

            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

        connection.close()
        print(f"\nSUCCESS! Executed {executed_count} SQL statements from {target_path.name}")
        return True

    except Exception as err:
        print(f"Connection/Execution Error: {err}")
        return False

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'backend/schema_mariadb.sql'
    import_sql_file(target)
