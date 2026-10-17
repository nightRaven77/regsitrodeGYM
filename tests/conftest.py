import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import backend.repository as repo_module
from backend.database import Base
import app_server


@pytest.fixture(autouse=True)
def isolated_test_db(tmp_path, monkeypatch):
    """
    Provides an isolated SQLite database per test function so tests never pollute
    the developer's ./gymtracker.db file.
    """
    test_sqlite_file = str(tmp_path / "test_gymtracker.db")
    monkeypatch.setattr(repo_module, "DB_FILE", test_sqlite_file)

    test_engine = create_engine(
        f"sqlite:///{test_sqlite_file}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    repo_module.StorageRepository.init_sqlite_db()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    if app_server.get_db is not None:
        app_server.app.dependency_overrides[app_server.get_db] = override_get_db

    yield

    app_server.app.dependency_overrides.clear()
    test_engine.dispose()
