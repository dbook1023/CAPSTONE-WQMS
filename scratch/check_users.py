
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env')
url = os.getenv('DATABASE_URL')
engine = create_engine(url)

with engine.connect() as conn:
    result = conn.execute(text("SELECT email, name FROM users"))
    for row in result:
        print(f"User: {row.email} ({row.name})")
