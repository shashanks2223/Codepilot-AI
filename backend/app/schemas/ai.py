from pydantic import BaseModel, Field
from typing import List, Optional

class ReviewCommentAI(BaseModel):
    file_path: str = Field(
        ..., 
        description="The path of the file containing the issue, e.g. 'src/main.js'."
    )
    line_number: int = Field(
        ..., 
        description="The line number (1-indexed) in the target file where the comment should be placed."
    )
    severity: str = Field(
        ..., 
        description="Severity level of the issue: 'info', 'warning', 'error', or 'critical'."
    )
    category: str = Field(
        ..., 
        description="Category: 'security', 'performance', 'readability', 'bug_risk', 'code_smell', 'complexity', 'documentation', 'testing'."
    )
    issue: str = Field(
        ..., 
        description="A short, readable title summarizing the issue."
    )
    explanation: str = Field(
        ..., 
        description="Detailed explanation of the issue, what is wrong, and why it matters."
    )
    suggested_fix: Optional[str] = Field(
        None, 
        description="A brief description of how to resolve this issue."
    )
    improved_code: Optional[str] = Field(
        None, 
        description="Complete corrected code block to replace the target code. Do NOT include markdown code fences here."
    )
    confidence_score: float = Field(
        1.0, 
        description="Confidence score of the AI model on this finding (float from 0.0 to 1.0)."
    )
    estimated_impact: str = Field(
        ..., 
        description="High-level estimation of impact if this issue is left unaddressed: 'high', 'medium', or 'low'."
    )

class PullRequestReviewAI(BaseModel):
    summary: str = Field(
        ..., 
        description="A professional, high-level markdown summary of the code changes, overall assessment, and key callouts."
    )
    comments: List[ReviewCommentAI] = Field(
        default=[], 
        description="List of inline code review suggestions."
    )

class AIChatRequest(BaseModel):
    pull_request_id: int
    message: str

class AIChatResponse(BaseModel):
    role: str
    content: str

class GenerateTestsRequest(BaseModel):
    file_path: str
    code_content: str
    language: str

class GenerateTestsResponse(BaseModel):
    test_code: str

class GenerateDocsRequest(BaseModel):
    file_path: str
    code_content: str
    doc_type: str  # 'readme', 'functions', 'classes', 'api', 'architecture'

class GenerateDocsResponse(BaseModel):
    documentation: str
