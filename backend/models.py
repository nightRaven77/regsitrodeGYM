from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, Index
from backend.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    avatar = Column(String, default="👤")
    created_at = Column(DateTime(timezone=True), default=utc_now)


class RoutineModel(Base):
    __tablename__ = "routines"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    days_data = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class WorkoutLogModel(Base):
    __tablename__ = "workout_logs"
    __table_args__ = (
        Index("ix_workout_logs_user_created", "user_id", "created_at"),
    )

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    day_name = Column(String, nullable=False)
    date_formatted = Column(String, nullable=False)
    time_formatted = Column(String, nullable=False)
    duration_seconds = Column(Integer, default=0)
    total_sets = Column(Integer, default=0)
    total_volume_kg = Column(Float, default=0.0)
    detailed_exercises = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class ProfileDataModel(Base):
    __tablename__ = "profile_data"

    profile_id = Column(String, primary_key=True, index=True)
    routines_json = Column(Text, nullable=True)
    weights_json = Column(Text, nullable=True)
    history_json = Column(Text, nullable=True)
    active_session_json = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ExerciseModel(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        Index("ix_exercises_cat_name", "category", "name"),
    )

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    equipment = Column(String, default="General")
    default_sets = Column(Integer, default=3)
    default_reps = Column(Integer, default=12)
    weight_unit = Column(String, default="reps")
    image_url = Column(String, nullable=True)
    musclewiki_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
