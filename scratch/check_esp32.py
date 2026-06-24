
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env')
url = os.getenv('DATABASE_URL')
engine = create_engine(url)

with engine.connect() as conn:
    # Check for the specific ESP32 MAC address
    serial = 'A86DAAFCB0BB'
    result = conn.execute(text("SELECT * FROM sensors WHERE serial_number = :s"), {"s": serial})
    row = result.fetchone()
    if row:
        print(f"Sensor found: {row.serial_number}, Status: {row.status}, Fountain ID: {row.fountain_id}")
    else:
        print(f"Sensor {serial} NOT FOUND in database.")
