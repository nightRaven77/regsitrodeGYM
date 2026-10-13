import os
import re
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Fetch database URL from environment variable (Supabase/Railway PostgreSQL or fallback to SQLite)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./gymtracker.db")


def sanitize_postgres_dsn(dsn: str) -> str:
    """Sanitizes PostgreSQL connection URL, stripping brackets and quoting special characters."""
    if not dsn or "sqlite" in dsn:
        return dsn
    s = dsn.strip().strip("'\"")
    for prefix in ("postgresql+psycopg2://", "postgresql://", "postgres://"):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    creds, at, host_part = s.rpartition("@")
    if not at:
        return dsn
    user, col, password = creds.partition(":")
    user = user.strip()
    password = password.strip()
    if password.startswith("[") and password.endswith("]"):
        password = password[1:-1].strip()

    host_port, slash, path_query = host_part.partition("/")
    path, q, query_str = path_query.partition("?")
    dbname = path.strip() or "postgres"

    if ":" in host_port:
        host, _, port_str = host_port.partition(":")
        port = int(port_str) if port_str.isdigit() else 5432
    else:
        host = host_port
        port = 5432

    sslmode = "require"
    if query_str:
        params = urllib.parse.parse_qs(query_str)
        if "sslmode" in params:
            sslmode = params["sslmode"][0]

    has_invalid_pct = bool(re.search(r"%(?![0-9a-fA-F]{2})", password))
    if has_invalid_pct:
        raw_password = password
    else:
        try:
            raw_password = urllib.parse.unquote(password)
        except Exception:
            raw_password = password

    encoded_pw = urllib.parse.quote(raw_password, safe="")
    encoded_user = urllib.parse.quote(user, safe="")
    return f"postgresql://{encoded_user}:{encoded_pw}@{host}:{port}/{dbname}?sslmode={sslmode}"


if "sqlite" in DATABASE_URL:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    clean_db_url = sanitize_postgres_dsn(DATABASE_URL)
    engine = create_engine(clean_db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
