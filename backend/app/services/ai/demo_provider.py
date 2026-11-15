"""Demo AI provider that returns realistic mock responses."""

import random

from app.services.ai.provider import AIProvider


class DemoProvider(AIProvider):
    """Returns realistic but clearly labeled demo/mock AI responses."""

    async def analyze_project(self, text: str, context: dict) -> dict:
        """Return a demo project analysis."""
        return {
            "mode": "[DEMO MODE]",
            "problem_statement": "[DEMO MODE] The project addresses the challenge of automating repetitive tasks in software development workflows.",
            "solution": "[DEMO MODE] An AI-powered assistant that integrates with existing CI/CD pipelines to identify bottlenecks and suggest optimizations.",
            "architecture": "[DEMO MODE] Microservices architecture with a React frontend, FastAPI backend, and PostgreSQL database. Uses Redis for caching and WebSockets for real-time updates.",
            "tech_stack": ["Python", "FastAPI", "React", "PostgreSQL", "Redis", "Docker"],
            "innovation": "[DEMO MODE] Novel use of LLMs to analyze build logs and predict pipeline failures before they occur.",
            "feasibility": "[DEMO MODE] High feasibility. Uses proven technologies with well-documented APIs. Could be deployed within 3-6 months.",
            "limitations": "[DEMO MODE] Requires significant training data for the ML model. May not generalize well across different CI/CD platforms initially.",
        }

    async def generate_questions(self, context: dict) -> list[str]:
        """Return judging questions tailored to the PPT presentation analysis and pitch context."""
        ppt_analysis = context.get("ppt_analysis") or {}
        extracted_text = context.get("extracted_text") or ""
        pitch = context.get("pitch") or ""
        lang = context.get("language") or "en"

        # Extract metadata from PPT analysis
        problem = ppt_analysis.get("problem_statement", "")
        solution = ppt_analysis.get("solution", "")
        architecture = ppt_analysis.get("architecture", "")
        tech_stack = ppt_analysis.get("tech_stack", [])
        if isinstance(tech_stack, list) and tech_stack:
            tech_stack_str = ", ".join(tech_stack[:4])
        else:
            tech_stack_str = str(tech_stack) if tech_stack else "Python & modern frameworks"

        # Clean demo tags if present
        tech_stack_str = tech_stack_str.replace("[DEMO MODE]", "").strip()

        questions = []

        if lang == "hi":
            if tech_stack_str:
                questions.append(f"आपके प्रेजेंटेशन डेक के अनुसार आपने {tech_stack_str} का उपयोग किया है। हाई लोड और डेटा कंसिस्टेंसी बनाए रखने के लिए आपका आर्किटेक्चर इसे कैसे संभालता है?")
            if architecture:
                questions.append("आपके प्रेजेंटेशन में दिखाए गए सिस्टम आर्किटेक्चर में अगर प्राइमरी बैकएंड सर्विस फेल हो जाए तो आपकी फॉलबैक या रिकवरी रणनीति क्या है?")
            if problem:
                questions.append("प्रोजेक्ट में चिन्हित मुख्य समस्या को हल करते समय आपको कौन सी सबसे बड़ी तकनीकी चुनौती का सामना करना पड़ा?")
            questions.extend([
                "आपके सिस्टम में यूजर डेटा सिक्योरिटी, रेट लिमिटिंग और ऑथेंटिकेशन का क्या फ्लो लागू किया गया है?",
                "क्या आपने नेटवर्क डिस्कनेक्शन या ऑफलाइन मोड के दौरान स्टेट सिंक और डेटा रिकवरी की कोई व्यवस्था की है?"
            ])
        elif lang == "hinglish":
            if tech_stack_str:
                questions.append(f"Aapke PPT deck ke according aapne {tech_stack_str} use kiya hai. High concurrency aur scale par data consistency kaise ensure hoti hai?")
            if architecture:
                questions.append("Presentation me bataye gaye system architecture me single point of failure ya edge network drops ko kaise handle kiya gaya hai?")
            if problem:
                questions.append("Is project ke core problem statement ko solve karte waqt implementation level par sabse bada technical challenge kya tha?")
            questions.extend([
                "API authentication, rate-limiting aur backend security guardrails ko aapne kaise protect kiya hai?",
                "Offline data reconciliation aur background async processing ke liye kaun sa design pattern use kiya gaya hai?"
            ])
        else:  # en
            if tech_stack_str:
                questions.append(f"In your presentation deck, you highlighted using {tech_stack_str}. How does your architecture maintain low latency and data consistency under concurrent load?")
            if architecture:
                questions.append("Reviewing the architecture in your presentation slides, what failover strategy is implemented if a critical downstream dependency becomes unavailable?")
            if problem:
                questions.append("Addressing the core problem outlined in your deck, what was the most complex technical trade-off you had to navigate during implementation?")
            questions.extend([
                "What security mechanisms, API rate limiting, and access control boundaries are enforced across your application layer?",
                "How does your solution handle offline state reconciliation, network dropouts, and transaction rollback edge cases?"
            ])

        return questions[:5]

    async def evaluate_response(self, question: str, answer: str, context: dict) -> dict:
        """Return a demo response evaluation."""
        score = random.randint(60, 95)
        return {
            "mode": "[DEMO MODE]",
            "score": score,
            "feedback": f"[DEMO MODE] The response demonstrates a {'strong' if score > 80 else 'moderate'} understanding of the topic.",
            "strengths": [
                "[DEMO MODE] Clear articulation of the technical approach",
                "[DEMO MODE] Good understanding of system design principles",
            ],
            "weaknesses": [
                "[DEMO MODE] Could provide more specific metrics and benchmarks",
                "[DEMO MODE] Should address potential failure modes more thoroughly",
            ],
        }

    async def generate_evaluation(self, session_data: dict) -> dict:
        """Return a demo full evaluation using the fixed rubric deterministically."""
        from app.services.ai.gemini_scoring import evaluate_deterministically
        scorecard = evaluate_deterministically(session_data)
        res = scorecard.to_dict()
        res["mode"] = "[DEMO MODE]"
        return res
