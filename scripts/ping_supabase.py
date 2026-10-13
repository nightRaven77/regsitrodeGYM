#!/usr/bin/env python3
"""
Supabase & App Keep-Alive Ping Script
------------------------------------
Executes keepalive operations against Supabase PostgreSQL and/or deployed App API
to prevent project pausing on Supabase Free Tier (which pauses after 7 days of inactivity).

Supported Keep-Alive Methods:
  1. Direct PostgreSQL query ('SELECT 1;') using DATABASE_URL via psycopg2/sqlalchemy.
  2. PostgREST API request using SUPABASE_URL + SUPABASE_KEY (standard library urllib).
  3. App Web Endpoint ping ('GET {APP_URL}/api/ping') to wake both server & DB.

Usage:
  python scripts/ping_supabase.py
  python scripts/ping_supabase.py --app https://mi-app.onrender.com
  python scripts/ping_supabase.py --db "postgresql://postgres:pass@db.ref.supabase.co:5432/postgres"
"""

import os
import sys
import re
import time
import json
import argparse
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone


def load_dotenv_if_exists():
    """Optional helper to load simple .env files without external dependencies."""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(root_dir, ".env")
    if not os.path.exists(env_path):
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"ℹ️ Nota: No se pudo leer archivo .env: {e}")


def sanitize_postgres_dsn(dsn: str):
    """
    Parses and sanitizes a PostgreSQL connection URL or DSN.
    Handles:
      - 'postgres://' vs 'postgresql://'
      - Passwords enclosed in literal brackets '[...]' (common copy-paste error from Supabase docs)
      - Passwords containing unencoded special characters ('%', '@', '#', ':', etc.)
      - Extracts kwargs suitable for direct psycopg2.connect(host=..., port=..., user=..., password=...)
      - Rebuilds a clean, properly percent-encoded URI suitable for SQLAlchemy / libpq
    """
    if not dsn:
        return None, {}, False

    s = dsn.strip().strip("'\"")

    if "sqlite" in s:
        return s, {"type": "sqlite"}, False

    # Normalize prefix
    for prefix in ("postgresql+psycopg2://", "postgresql://", "postgres://"):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break

    # Split credentials from host
    creds, at, host_part = s.rpartition("@")
    if not at:
        return dsn, {}, False

    user, col, password = creds.partition(":")
    user = user.strip()
    password = password.strip()

    # Strip literal brackets if user copied [YOUR-PASSWORD] or [MiPassword]
    if password.startswith("[") and password.endswith("]"):
        password = password[1:-1].strip()

    is_placeholder = password.upper() in (
        "YOUR-PASSWORD", "PASSWORD", "<YOUR-PASSWORD>", "[YOUR-PASSWORD]", ""
    )

    # Host, port, path, query
    host_port, slash, path_query = host_part.partition("/")
    path, q, query_str = path_query.partition("?")
    dbname = path.strip() or "postgres"

    if ":" in host_port:
        host, _, port_str = host_port.partition(":")
        port = int(port_str) if port_str.isdigit() else 5432
    else:
        host = host_port
        port = 5432

    # Query params (sslmode)
    sslmode = "require"
    if query_str:
        params = urllib.parse.parse_qs(query_str)
        if "sslmode" in params:
            sslmode = params["sslmode"][0]

    # Handle unencoded or partially encoded characters
    has_invalid_pct = bool(re.search(r"%(?![0-9a-fA-F]{2})", password))
    if has_invalid_pct:
        raw_password = password
    else:
        try:
            raw_password = urllib.parse.unquote(password)
        except Exception:
            raw_password = password

    encoded_password = urllib.parse.quote(raw_password, safe="")
    encoded_user = urllib.parse.quote(user, safe="")
    clean_uri = f"postgresql://{encoded_user}:{encoded_password}@{host}:{port}/{dbname}?sslmode={sslmode}"

    conn_kwargs = {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": raw_password,
        "sslmode": sslmode
    }

    return clean_uri, conn_kwargs, is_placeholder


def ping_postgres_direct(db_url: str) -> dict:
    """Connect directly to PostgreSQL via psycopg2 or sqlalchemy and run SELECT 1."""
    clean_uri, conn_kwargs, is_placeholder = sanitize_postgres_dsn(db_url)

    if is_placeholder:
        return {
            "method": "PostgreSQL Direct",
            "success": False,
            "latency_ms": 0,
            "error": (
                "⚠️ Detectamos que DATABASE_URL contiene el placeholder '[YOUR-PASSWORD]'. "
                "Debes reemplazarlo por tu contraseña real de Supabase en GitHub Secrets."
            )
        }

    start_time = time.time()

    # 1. Intentar primero con psycopg2 usando kwargs directos
    # Al pasar host, port, dbname, user, password como kwargs independientes,
    # libpq usa PQconnectdbParams y NO realiza decodificación de URI,
    # evitando por completo el error 'invalid dsn: invalid percent-encoded token'.
    if conn_kwargs and conn_kwargs.get("host"):
        try:
            import psycopg2
            try:
                conn = psycopg2.connect(**conn_kwargs, connect_timeout=15)
            except Exception as e_first:
                # Si falla por autenticación y la contraseña original tenía %, probar con contraseña alternativa
                if "authentication failed" in str(e_first).lower() and "%" in db_url:
                    alt_kwargs = dict(conn_kwargs)
                    alt_kwargs["password"] = urllib.parse.unquote(conn_kwargs["password"])
                    conn = psycopg2.connect(**alt_kwargs, connect_timeout=15)
                else:
                    raise e_first

            cur = conn.cursor()
            cur.execute("SELECT 1;")
            res = cur.fetchone()
            cur.close()
            conn.close()
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "method": "PostgreSQL Direct (psycopg2 params)",
                "success": res[0] == 1,
                "latency_ms": latency_ms,
                "details": f"Query 'SELECT 1;' ejecutado con éxito ({latency_ms} ms)."
            }
        except ImportError:
            pass
        except Exception as e:
            err_msg = str(e)
            if "authentication failed" in err_msg.lower():
                err_msg += " (Verifica que la contraseña configurada en DATABASE_URL sea correcta)."
            elif "timeout" in err_msg.lower():
                err_msg += " (Tiempo de espera agotado al conectar a Supabase)."
            return {
                "method": "PostgreSQL Direct (psycopg2)",
                "success": False,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "error": err_msg
            }

    # 2. Fallback a SQLAlchemy con clean_uri (garantizada con percent-encoding válido)
    target_uri = clean_uri or db_url
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(target_uri, pool_pre_ping=True)
        with engine.connect() as connection:
            res = connection.execute(text("SELECT 1;")).scalar()
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "method": "PostgreSQL Direct (SQLAlchemy)",
            "success": res == 1,
            "latency_ms": latency_ms,
            "details": f"Query 'SELECT 1;' ejecutado con éxito ({latency_ms} ms)."
        }
    except Exception as e:
        err_msg = str(e)
        if "authentication failed" in err_msg.lower():
            err_msg += " (Verifica que la contraseña configurada en DATABASE_URL sea correcta)."
        return {
            "method": "PostgreSQL Direct (SQLAlchemy)",
            "success": False,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "error": err_msg
        }


def ping_supabase_rest(supabase_url: str, supabase_key: str) -> dict:
    """Ping Supabase PostgREST API with standard library urllib."""
    clean_url = supabase_url.rstrip("/")
    endpoint = f"{clean_url}/rest/v1/exercises?select=id&limit=1"

    req = urllib.request.Request(endpoint, headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "User-Agent": "GymTracker-KeepAlive/2.0"
    })

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "method": "Supabase REST API (PostgREST)",
                "success": 200 <= resp.status < 300,
                "latency_ms": latency_ms,
                "details": f"HTTP {resp.status} OK recibido ({latency_ms} ms)."
            }
    except urllib.error.HTTPError as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "method": "Supabase REST API (PostgREST)",
            "success": e.code in (200, 206, 400),
            "latency_ms": latency_ms,
            "error": f"HTTP {e.code}: {e.reason}"
        }
    except Exception as e:
        return {
            "method": "Supabase REST API (PostgREST)",
            "success": False,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "error": str(e)
        }


def ping_app_endpoint(app_url: str) -> dict:
    """Ping the deployed web application's /api/ping endpoint."""
    clean_url = app_url.rstrip("/")
    if not clean_url.endswith("/api/ping"):
        clean_url = f"{clean_url}/api/ping"

    req = urllib.request.Request(clean_url, headers={
        "User-Agent": "GymTracker-KeepAlive/2.0"
    })

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
            latency_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "method": "App Web Endpoint (/api/ping)",
                "success": resp.status == 200 and data.get("keepalive_success", True),
                "latency_ms": latency_ms,
                "details": f"HTTP 200 OK - DB: {data.get('primary_database', 'N/A')} ({latency_ms} ms)"
            }
    except Exception as e:
        return {
            "method": "App Web Endpoint (/api/ping)",
            "success": False,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "error": str(e)
        }


def main():
    load_dotenv_if_exists()

    parser = argparse.ArgumentParser(description="Supabase Keep-Alive Ping Tool")
    parser.add_argument("--db", default=os.environ.get("DATABASE_URL"), help="PostgreSQL connection string")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"), help="Supabase Project URL")
    parser.add_argument("--supabase-key", default=os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY"), help="Supabase API Anon Key")
    parser.add_argument("--app", default=os.environ.get("APP_URL"), help="Deployed App URL (e.g. https://mygym.onrender.com)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate ping locally against fallback")
    args = parser.parse_args()

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print("=" * 60)
    print(f"🏓 SUPABASE KEEP-ALIVE PING - {now_utc}")
    print("=" * 60)

    results = []

    # 1. Direct PostgreSQL Ping
    if args.db and not args.db.startswith("sqlite"):
        print("\n🔹 [1/3] Ejecutando ping directo a PostgreSQL...")
        res = ping_postgres_direct(args.db)
        results.append(res)
        if res.get("success"):
            print(f"  ✅ Éxito: {res.get('details')}")
        else:
            print(f"  ❌ Error: {res.get('error')}")
    else:
        print("\n🔹 [1/3] Direct PostgreSQL: Omitido (DATABASE_URL no configurada)")

    # 2. Supabase REST API Ping
    if args.supabase_url and args.supabase_key:
        print("\n🔹 [2/3] Ejecutando ping a API REST PostgREST de Supabase...")
        res = ping_supabase_rest(args.supabase_url, args.supabase_key)
        results.append(res)
        if res.get("success"):
            print(f"  ✅ Éxito: {res.get('details')}")
        else:
            print(f"  ❌ Error: {res.get('error')}")
    else:
        print("\n🔹 [2/3] Supabase REST API: Omitido (SUPABASE_URL / SUPABASE_KEY no configurados)")

    # 3. App Web Endpoint Ping
    if args.app:
        print(f"\n🔹 [3/3] Ejecutando ping a endpoint web: {args.app} ...")
        res = ping_app_endpoint(args.app)
        results.append(res)
        if res.get("success"):
            print(f"  ✅ Éxito: {res.get('details')}")
        else:
            print(f"  ❌ Error: {res.get('error')}")
    else:
        print("\n🔹 [3/3] App Endpoint: Omitido (APP_URL no configurada)")

    # Dry-run or local fallback test if no external targets configured
    if not results:
        if args.dry_run or (not args.db and not args.supabase_url and not args.app):
            print("\nℹ️ No se detectaron credenciales remotas configuradas.")
            print("   Ejecutando prueba local en SQLite fallback...")
            try:
                import sqlite3
                conn = sqlite3.connect(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "gymtracker.db"))
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.fetchone()
                conn.close()
                print("   ✅ Conexión y consulta local SQLite verificadas correctamente.")
                results.append({"method": "SQLite Local Test", "success": True, "details": "Local fallback OK"})
            except Exception as e:
                print(f"   ❌ Error en prueba local: {e}")
                results.append({"method": "SQLite Local Test", "success": False, "error": str(e)})

    # Summary
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE EJECUCIÓN")
    print("=" * 60)

    total_attempts = len(results)
    successful = sum(1 for r in results if r.get("success"))

    for r in results:
        status_icon = "✅" if r.get("success") else "❌"
        lat = f"({r.get('latency_ms')} ms)" if "latency_ms" in r else ""
        print(f"  {status_icon} {r['method']}: {'OK' if r.get('success') else 'FALLÓ'} {lat}")

    print("-" * 60)
    if successful > 0:
        print(f"🎉 Éxito: Se registraron {successful}/{total_attempts} pings activos.")
        print("💡 Tu proyecto de Supabase mantendrá su estado activo y evitará ser pausado.")
        sys.exit(0)
    else:
        print(f"⚠️ Advertencia: 0/{total_attempts} pings fueron exitosos.")
        print("💡 Verifica tus credenciales (DATABASE_URL, SUPABASE_URL, APP_URL) en tus variables de entorno.")
        sys.exit(1)


if __name__ == "__main__":
    main()
