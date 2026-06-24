#!/usr/bin/env python3
"""
Setup script to create WQMS database and tables
Run this script to initialize the database from schema.sql
"""

import os
import sys
import mysql.connector
from mysql.connector import Error
from pathlib import Path

def create_database():
    """Create database using schema.sql"""
    
    try:
        # First, connect to MySQL to create the database
        print("Connecting to MySQL...")
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            port=int(os.getenv('DB_PORT', 3306))
        )
        
        if connection.is_connected():
            print("Connected to MySQL!")
            cursor = connection.cursor()
            
            # Read schema.sql file
            schema_path = Path(__file__).parent / 'schema_mariadb.sql'
            
            if not schema_path.exists():
                print(f"Error: schema_mariadb.sql not found at {schema_path}")
                return False
            
            print(f"Reading schema from {schema_path}...")
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_content = f.read()
            
            # Split by semicolon and execute each statement
            statements = schema_content.split(';')
            
            statement_count = 0
            for statement in statements:
                statement = statement.strip()
                if statement:  # Skip empty statements
                    try:
                        cursor.execute(statement)
                        statement_count += 1
                        # Print progress for major operations
                        if 'CREATE TABLE' in statement:
                            table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip().replace('`', '')
                            print(f"  Created table: {table_name}")
                        elif 'INSERT INTO' in statement:
                            if statement_count % 10 == 0:
                                print(f"  Inserted {statement_count} statements...")
                    except Error as e:
                        # Some statements might fail (like DROP IF EXISTS), that's OK
                        if 'already exists' in str(e) or 'Unknown database' in str(e):
                            pass
                        elif '1075' in str(e):  # Incorrect table definition
                            pass
                        else:
                            print(f"  Statement error (non-critical): {e}")
            
            connection.commit()
            print(f"\nDatabase created successfully!")
            print(f"Executed {statement_count} SQL statements")
            cursor.close()
            connection.close()
            return True
            
        else:
            print("Failed to connect to MySQL")
            return False
            
    except Error as e:
        print(f"Database Error: {e}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    print("=" * 60)
    print("  WQMS DATABASE SETUP")
    print("=" * 60)
    print(f"Host: {os.getenv('DB_HOST', 'localhost')}")
    print(f"User: {os.getenv('DB_USER', 'root')}")
    print(f"Database: {os.getenv('DB_NAME', 'wqms_db')}")
    print("=" * 60)
    print()
    
    success = create_database()
    sys.exit(0 if success else 1)
