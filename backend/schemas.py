from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class UserRegisterSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)
    avatar: str = "👤"


class UserLoginSchema(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserProfileUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    avatar: Optional[str] = Field(default=None, max_length=16)


class SyncPayload(BaseModel):
    routines: Optional[List[Dict[str, Any]]] = None
    weightsHistory: Optional[Dict[str, Any]] = None
    workoutHistory: Optional[List[Dict[str, Any]]] = None
    activeSession: Optional[Dict[str, Any]] = None
    exerciseNotes: Optional[Dict[str, str]] = None
    updatedAt: Optional[str] = None


class ExerciseCreateSchema(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=120)
    category: str = Field(..., min_length=1, max_length=50)
    equipment: Optional[str] = "General"
    defaultSets: Optional[int] = Field(default=3, ge=1, le=20)
    defaultReps: Optional[int] = Field(default=12, ge=1, le=600)
    unit: Optional[str] = "reps"


class PushSubscriptionSchema(BaseModel):
    endpoint: str = Field(..., min_length=1)
    keys: Optional[Dict[str, str]] = None
    expirationTime: Optional[Any] = None


class RestPushScheduleSchema(BaseModel):
    seconds: int = Field(default=60, ge=1, le=3600)
    exerciseName: Optional[str] = Field(default=None, max_length=120)

