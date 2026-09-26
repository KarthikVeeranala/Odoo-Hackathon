import sqlite3
import os
from contextlib import contextmanager
from typing import Generator
from app.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    """Creates and configures a SQLite connection with WAL mode and foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database operations with automatic commit/rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Initializes the database schema if tables do not exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")

        # 2. Categories table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                code TEXT NOT NULL
            );
        """)

        # 3. Warehouses table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS warehouses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                address TEXT
            );
        """)

        # 4. Locations table (2-level physical hierarchy: Warehouse -> Location/Rack)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('STORAGE', 'RECEIVING', 'STAGING', 'PRODUCTION')),
                capacity REAL NOT NULL DEFAULT 500.0
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_locations_warehouse ON locations(warehouse_id);")

        # 5. Products table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
                uom TEXT NOT NULL,
                safety_stock REAL NOT NULL DEFAULT 0.0,
                reorder_quantity REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);")

        # 6. Stock Levels table (Authoritative on-hand balance per product per location)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stock_levels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
                quantity REAL NOT NULL DEFAULT 0.0,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE (product_id, location_id)
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_levels_location ON stock_levels(location_id);")

        # Seed standard initial categories if empty
        cursor.execute("SELECT COUNT(*) as count FROM categories")
        if cursor.fetchone()["count"] == 0:
            cursor.executemany(
                "INSERT INTO categories (name, code) VALUES (?, ?)",
                [
                    ("Raw Metals", "RAW"),
                    ("Fasteners", "FAS"),
                    ("Electrical", "ELE"),
                    ("Finished Goods", "FG"),
                ]
            )

        # Seed standard warehouses if empty
        cursor.execute("SELECT COUNT(*) as count FROM warehouses")
        if cursor.fetchone()["count"] == 0:
            cursor.execute(
                "INSERT INTO warehouses (code, name, address) VALUES (?, ?, ?)",
                ("WH1", "Main Central Logistics Hub", "100 Logistics Blvd, Dallas, TX")
            )
            wh1_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO warehouses (code, name, address) VALUES (?, ?, ?)",
                ("WH2", "Assembly & Production Facility", "250 Innovation Way, Austin, TX")
            )
            wh2_id = cursor.lastrowid

            # Seed standard locations under warehouses
            cursor.executemany(
                "INSERT INTO locations (warehouse_id, code, name, type, capacity) VALUES (?, ?, ?, ?, ?)",
                [
                    (wh1_id, "WH1-A1", "Rack A1", "STORAGE", 500.0),
                    (wh1_id, "WH1-A2", "Rack A2", "STORAGE", 500.0),
                    (wh1_id, "WH1-REC", "Receiving Dock", "RECEIVING", 1000.0),
                    (wh1_id, "WH1-STG", "Staging Bay", "STAGING", 400.0),
                    (wh1_id, "WH1-DMG", "Quarantine Inspection", "STORAGE", 200.0),
                    (wh2_id, "WH2-PROD", "Production Floor", "PRODUCTION", 300.0),
                ]
            )
