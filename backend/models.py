from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    avatar = Column(String, default="👨‍🏽‍🦱")
    created_at = Column(DateTime, default=datetime.utcnow)

class RoutineModel(Base):
    __tablename__ = "routines"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    days_data = Column(JSON, nullable=False)  # JSON payload for days & exerciseIds
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WorkoutLogModel(Base):
    __tablename__ = "workout_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    day_name = Column(String, nullable=False)
    date_formatted = Column(String, nullable=False)
    time_formatted = Column(String, nullable=False)
    duration_seconds = Column(Integer, default=0)
    total_sets = Column(Integer, default=0)
    total_volume_kg = Column(Float, default=0.0)
    detailed_exercises = Column(JSON, nullable=True)  # Detailed per-set breakdown
    created_at = Column(DateTime, default=datetime.utcnow)
