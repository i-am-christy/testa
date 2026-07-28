from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from uuid import UUID

from api.db.database import get_db
from api.v1.models.user import User
from api.v1.models.exam import Paper, Exam, Question, UserExamSession
from api.v1.schemas.exam import (
    PaperCreate, PaperResponse,
    ExamCreate, ExamResponse,
    QuestionCreate, QuestionResponse
)

from api.v1.services.user import user_service
from api.v1.services.proctoring_summary import build_proctoring_summary

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/papers", status_code=status.HTTP_201_CREATED, response_model=PaperResponse)
def create_paper(
    paper_data: PaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user)
):
    """Admin endpoint to create a new exam paper (subject)."""
    
    user_service.get_current_admin_user(current_user=current_user)

    # Check if a paper with the same title already exists
    existing_paper = db.query(Paper).filter(Paper.title == paper_data.title).first()
    if existing_paper:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A paper with this title already exists."
        )
    
    new_paper = Paper(**paper_data.model_dump())
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    return new_paper


@router.post("/exams", status_code=status.HTTP_201_CREATED, response_model=ExamResponse)
def create_exam(
    exam_data: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user)
):
    """Admin endpoint to create a specific exam instance for a paper."""
    
    # Verify the paper_id exists
    
    user_service.get_current_admin_user(current_user=current_user)

    paper = db.query(Paper).filter(Paper.id == exam_data.paper_id).first()
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with id {exam_data.paper_id} not found."
        )
    
    new_exam = Exam(**exam_data.model_dump())
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam


@router.post("/exams/{exam_id}/questions", status_code=status.HTTP_201_CREATED, response_model=QuestionResponse)
def add_question_to_exam(
    exam_id: UUID,
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user)
):
    user_service.get_current_admin_user(current_user=current_user)

    """Admin endpoint to add a question to a specific exam."""

    
    
    # Verify the exam_id exists
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam with id {exam_id} not found."
        )
    
    # Create the question and associate it with the exam
    new_question = Question(**question_data.model_dump(), exam_id=exam_id)
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question


def _session_card(session: UserExamSession) -> dict:
    summary = build_proctoring_summary(session)
    return {
        "session_id": str(session.id),
        "user_name": f"{session.user.first_name or ''} {session.user.last_name or ''}".strip() or session.user.email,
        "exam_title": session.exam.paper.title,
        "start_time": session.start_time.isoformat(),
        "duration_minutes": session.exam.duration_minutes,
        "is_active": session.end_time is None,
        "score": session.score,
        "total_violations": summary["total_violations"],
        "risk_score": summary["risk_score"],
        "risk_band": summary["risk_band"],
    }


@router.get("/proctoring/sessions")
def list_active_proctoring_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user),
):
    """Live-monitoring feed: currently in-progress exam sessions with their violation counts and risk band."""
    user_service.get_current_admin_user(current_user=current_user)

    sessions = db.query(UserExamSession).filter(UserExamSession.end_time == None).all()
    return [_session_card(s) for s in sessions]


@router.get("/exam-sessions")
def list_exam_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user),
):
    """Submission review feed: all exam sessions (active and completed) with their risk band."""
    user_service.get_current_admin_user(current_user=current_user)

    sessions = db.query(UserExamSession).order_by(UserExamSession.created_at.desc()).all()
    return [_session_card(s) for s in sessions]


@router.get("/exam-sessions/{session_id}/proctoring-summary")
def get_session_proctoring_summary(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(user_service.get_current_user),
):
    """Full violation timeline + risk rating for a single session, for the admin review detail view."""
    user_service.get_current_admin_user(current_user=current_user)

    session = db.query(UserExamSession).filter(UserExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found.")

    return build_proctoring_summary(session)