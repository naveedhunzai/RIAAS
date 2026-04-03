from pydantic import BaseModel


class IngestResponse(BaseModel):
    loaded_pages: int
    total_chunks: int


class AnswerRequest(BaseModel):
    question: str
    top_k: int | None = None
    model: str | None = None


class AskResponse(BaseModel):
    question: str
    top_k: int
    results: list[dict]


class ExtractRequirementsRequest(BaseModel):
    topic: str
    top_k: int | None = None
    model: str | None = None


class CreateActionsRequest(BaseModel):
    model: str = "gemma3:1b"


class UpdateActionStatusRequest(BaseModel):
    status: str

