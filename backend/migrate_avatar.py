"""
Migration: Add avatar column to users and admins tables.
Run this once to add the column to an existing database.
"""

from models import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Add avatar column to users table
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL"))
            print("✓ Added 'avatar' column to 'users' table.")
        except Exception as e:
            if 'Duplicate column' in str(e) or 'already exists' in str(e).lower():
                print("⊘ 'avatar' column already exists in 'users' table.")
            else:
                print(f"✗ Error adding avatar to users: {e}")

        # Add avatar column to admins table
        try:
            conn.execute(text("ALTER TABLE admins ADD COLUMN avatar LONGTEXT NULL"))
            print("✓ Added 'avatar' column to 'admins' table.")
        except Exception as e:
            if 'Duplicate column' in str(e) or 'already exists' in str(e).lower():
                print("⊘ 'avatar' column already exists in 'admins' table.")
            else:
                print(f"✗ Error adding avatar to admins: {e}")

        conn.commit()
        print("\nMigration complete.")

if __name__ == '__main__':
    migrate()
