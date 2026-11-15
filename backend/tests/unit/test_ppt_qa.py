"""Unit tests verifying PPT analysis and grounded AI question generation."""

import pytest
from app.services.ai.demo_provider import DemoProvider


@pytest.mark.asyncio
async def test_ppt_grounded_question_generation_english():
    provider = DemoProvider()
    context = {
        "pitch": "",
        "language": "en",
        "turn": 1,
        "ppt_analysis": {
            "problem_statement": "Preventing crop failures in rural farming",
            "solution": "IoT automated irrigation and soil moisture analysis",
            "architecture": "Edge sensor microservices connected to cloud PostgreSQL",
            "tech_stack": ["FastAPI", "React", "PostgreSQL", "Docker"],
            "limitations": "Cellular connectivity in remote villages",
        },
    }
    questions = await provider.generate_questions(context)
    assert len(questions) > 0
    # Questions must reference PPT tech stack or architecture
    combined = " ".join(questions)
    assert any(tech in combined for tech in ["FastAPI", "PostgreSQL", "React", "Docker"]) or "architecture" in combined.lower()


@pytest.mark.asyncio
async def test_ppt_grounded_question_generation_hinglish():
    provider = DemoProvider()
    context = {
        "pitch": "",
        "language": "hinglish",
        "turn": 1,
        "ppt_analysis": {
            "problem_statement": "Manual bank KYC verification delays",
            "solution": "Automated OCR and document face match",
            "architecture": "Python AI pipeline with FastAPI and Redis queue",
            "tech_stack": ["FastAPI", "Redis", "OpenCV"],
        },
    }
    questions = await provider.generate_questions(context)
    assert len(questions) > 0
    combined = " ".join(questions)
    # Hinglish must use Roman alphabet and reference PPT contents
    assert any(w in combined.lower() for w in ["ppt", "architecture", "kaise", "use"])
    # Must NOT contain Devanagari characters
    assert not any('\u0900' <= char <= '\u097F' for char in combined)


@pytest.mark.asyncio
async def test_ppt_grounded_question_generation_hindi():
    provider = DemoProvider()
    context = {
        "pitch": "",
        "language": "hi",
        "turn": 1,
        "ppt_analysis": {
            "problem_statement": "ऑनलाइन शिक्षा में छात्रों की कम सहभागिता",
            "solution": "AI-संचालित व्यक्तिगत शिक्षण सहायक",
            "architecture": "माइक्रोसर्विस आर्किटेक्चर",
            "tech_stack": ["Python", "FastAPI"],
        },
    }
    questions = await provider.generate_questions(context)
    assert len(questions) > 0
    combined = " ".join(questions)
    # Hindi must contain Devanagari characters
    assert any('\u0900' <= char <= '\u097F' for char in combined)
