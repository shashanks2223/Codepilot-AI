from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.models import User, PullRequest, Chat, Message
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    GenerateTestsRequest,
    GenerateTestsResponse,
    GenerateDocsRequest,
    GenerateDocsResponse
)
from app.core.config import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

router = APIRouter()

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_pr(
    payload: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Chat with Gemini AI regarding a specific Pull Request.
    Maintains chat history and pulls PR diff as context.
    """
    pr = db.query(PullRequest).filter(PullRequest.id == payload.pull_request_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")

    # Fetch or create Chat record
    chat = db.query(Chat).filter(Chat.pull_request_id == pr.id).first()
    if not chat:
        chat = Chat(pull_request_id=pr.id)
        db.add(chat)
        db.commit()
        db.refresh(chat)

    # Save User message
    user_msg = Message(chat_id=chat.id, role="user", content=payload.message)
    db.add(user_msg)
    db.commit()

    # Load recent conversation history (max 10 messages)
    history = db.query(Message).filter(Message.chat_id == chat.id).order_by(Message.created_at.asc()).limit(10).all()

    # Developer Bypass if Gemini API Key is missing
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_") or settings.GEMINI_API_KEY == "":
        # Generate generic smart mock response
        mock_reply = f"Mock AI Response: I received your request regarding PR #{pr.github_number} ('{pr.title}'). "
        if "test" in payload.message.lower():
            mock_reply += "To generate tests for this PR, you can use the '/generate-tests' endpoint or check out the suggestions in the review comments tab."
        elif "leak" in payload.message.lower() or "memory" in payload.message.lower():
            mock_reply += "Analyzing diff for memory leaks... No immediate memory leaks were identified, but the recursion in calculate_fibonacci should be refactored to avoid call stack fatigue."
        else:
            mock_reply += f"I see you said: '{payload.message}'. How can I help you refactor or review this code further?"
            
        assistant_msg = Message(chat_id=chat.id, role="assistant", content=mock_reply)
        db.add(assistant_msg)
        db.commit()
        return AIChatResponse(role="assistant", content=mock_reply)

    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )

        messages_for_llm = [
            SystemMessage(content=(
                f"You are CodePilot AI, a context-aware programming assistant. "
                f"You are helping a developer review a pull request titled '{pr.title}' (PR #{pr.github_number}) "
                f"created by author '{pr.author_username}'. "
                f"Answer any questions regarding complexity, security risks, memory leaks, unit tests, "
                f"and architecture recommendations."
            ))
        ]

        for msg in history[:-1]:  # exclude the user message we just added since we'll append it
            if msg.role == "user":
                messages_for_llm.append(HumanMessage(content=msg.content))
            else:
                messages_for_llm.append(AIMessage(content=msg.content))
                
        messages_for_llm.append(HumanMessage(content=payload.message))

        response = await llm.ainvoke(messages_for_llm)
        ai_content = response.content

        # Save AI message
        assistant_msg = Message(chat_id=chat.id, role="assistant", content=ai_content)
        db.add(assistant_msg)
        db.commit()

        return AIChatResponse(role="assistant", content=ai_content)

    except Exception as e:
        # Graceful fallback response
        error_msg = f"Sorry, I failed to connect to Gemini API. Error details: {str(e)}"
        assistant_msg = Message(chat_id=chat.id, role="assistant", content=error_msg)
        db.add(assistant_msg)
        db.commit()
        return AIChatResponse(role="assistant", content=error_msg)


@router.post("/generate-tests", response_model=GenerateTestsResponse)
async def generate_tests(
    payload: GenerateTestsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate unit tests for a given block of code depending on the programming language.
    """
    lang = payload.language.lower()
    framework = "pytest" if lang == "python" else "Jest" if lang in ["javascript", "typescript"] else "JUnit"

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_") or settings.GEMINI_API_KEY == "":
        # Mock code test generation
        mock_tests = ""
        if lang == "python":
            mock_tests = (
                "import pytest\n"
                f"from {payload.file_path.split('/')[-1].replace('.py', '')} import *\n\n"
                "def test_success_case():\n"
                "    # TODO: Add assertions here\n"
                "    assert True\n"
            )
        else:
            mock_tests = (
                f"describe('Tests for {payload.file_path}', () => {{\n"
                "  test('should pass', () => {\n"
                "    expect(true).toBe(true);\n"
                "  });\n"
                "});\n"
            )
        return GenerateTestsResponse(test_code=mock_tests)

    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2
        )
        prompt = (
            f"You are a professional software engineer. Generate a comprehensive suite of unit tests "
            f"using the '{framework}' framework for the following code snippet from '{payload.file_path}':\n\n"
            f"```\n{payload.code_content}\n```\n\n"
            f"Provide only the test code content without any conversational preamble or markdown code fences."
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return GenerateTestsResponse(test_code=response.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate tests: {str(e)}")


@router.post("/generate-docs", response_model=GenerateDocsResponse)
async def generate_docs(
    payload: GenerateDocsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate documentation (README, function details, classes, API, architecture summary).
    """
    doc_type = payload.doc_type.lower()
    
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_") or settings.GEMINI_API_KEY == "":
        mock_doc = (
            f"# Documentation for {payload.file_path}\n\n"
            f"This is a mock generated summary document for type: **{doc_type.upper()}**.\n\n"
            "## Summary\n"
            "The file provides utility functions for application logic.\n"
        )
        return GenerateDocsResponse(documentation=mock_doc)

    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
        prompt = (
            f"Generate professional Markdown documentation for the file '{payload.file_path}'. "
            f"The documentation style should be target type: '{doc_type}'.\n\n"
            f"Target Code Snippet:\n"
            f"```\n{payload.code_content}\n```\n\n"
            f"Provide only the markdown document without additional conversational output."
        )
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return GenerateDocsResponse(documentation=response.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate docs: {str(e)}")
