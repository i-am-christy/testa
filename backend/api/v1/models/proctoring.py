import enum
from sqlalchemy import Column, String, ForeignKey, Text, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from api.v1.models.base import BaseTableModel


class ViolationType(str, enum.Enum):
    IDENTITY_MISMATCH = "identity_mismatch"
    LOOK_AWAY = "look_away"
    PROHIBITED_OBJECT = "prohibited_object"
    MULTIPLE_PERSON = "multiple_person"
    VOICE_ACTIVITY = "voice_activity"
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    DEVTOOLS = "devtools"
    COPY_PASTE = "copy_paste"
    UNLOAD_ATTEMPT = "unload_attempt"


class ProctoringViolation(BaseTableModel):
    __tablename__ = "proctoring_violations"

    session_id = Column(UUID(as_uuid=True), ForeignKey("user_exam_sessions.id"), nullable=False)
    violation_type = Column(SQLAlchemyEnum(ViolationType), nullable=False)
    message = Column(Text, nullable=True)
    snapshot_url = Column(String, nullable=True)
    audio_clip_url = Column(String, nullable=True)

    session = relationship("UserExamSession", back_populates="violations")
