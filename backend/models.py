from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from backend.database import Base

class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    avatar = Column(String, default="👤")
    created_at = Column(DateTime, default=datetime.utcnow)

class RoutineModel(Base):
    __tablename__ = "routines"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    days_data = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WorkoutLogModel(Base):
    __tablename__ = "workout_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    day_name = Column(String, nullable=False)
    date_formatted = Column(String, nullable=False)
    time_formatted = Column(String, nullable=False)
    duration_seconds = Column(Integer, default=0)
    total_sets = Column(Integer, default=0)
    total_volume_kg = Column(Float, default=0.0)
    detailed_exercises = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProfileDataModel(Base):
    __tablename__ = "profile_data"

    profile_id = Column(String, primary_key=True, index=True)
    routines_json = Column(Text, nullable=True)
    weights_json = Column(Text, nullable=True)
    history_json = Column(Text, nullable=True)
    active_session_json = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExerciseModel(Base):
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    equipment = Column(String, default="General")
    default_sets = Column(Integer, default=3)
    default_reps = Column(Integer, default=10)
    weight_unit = Column(String, default="kg")
    image_url = Column(String, nullable=True)
    musclewiki_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
