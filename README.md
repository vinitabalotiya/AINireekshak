# AINireekshak
# ⚖️ AINEERKSHAK — AI-Powered Autonomous Hackathon Judge

<p align="center">
  <strong>Beyond Human Judging. Beyond Basic Automation.</strong>
</p>

<p align="center">
  An intelligent, multimodal AI judging platform that evaluates hackathon projects through live pitch analysis, technical verification, presentation assessment and AI-powered questioning.
</p>

---

## 🚀 Overview

**Aineerkshak** is an AI-powered hackathon judging platform designed to transform how hackathons are evaluated.

Traditional hackathon judging often depends on limited evaluation time, subjective opinions, inconsistent scoring and the difficulty of assessing multiple projects fairly.

Aineerkshak aims to solve these challenges by introducing a multi-agent AI judging system capable of evaluating projects across multiple dimensions.

Unlike conventional AI evaluation tools that simply analyse uploaded documents or presentations, Aineerkshak aims to observe live pitches, understand spoken explanations, analyse presentation quality, inspect source code, verify project functionality and generate evidence-based scores.

Our vision is to create an intelligent virtual judging panel that works alongside human organisers to make hackathon evaluation more transparent, consistent and efficient.

## ✨ Key Features

### 🎤 1. Live Pitch Analysis
- Real-time speech recognition and transcription.
- Analysis of speech clarity and speaking pace.
- Detection of filler words and unnecessary pauses.
- Evaluation of explanation quality and communication.
- Automatic pitch timing and time-limit monitoring.

### 👁️ 2. Visual Presentation Analysis
- Camera-based presentation monitoring.
- Analysis of observable gestures and posture.
- Eye-contact estimation.
- Slide and screen-sharing analysis.
- Presentation feedback based on observable communication patterns.

### 🧠 3. Multi-Agent AI Judging

Multiple specialised AI agents independently evaluate different aspects of a project.

| AI Agent | Responsibility |
|---|---|
| Pitch Judge | Evaluates communication and explanation |
| Presentation Judge | Evaluates visual presentation quality |
| Technical Judge | Analyses implementation and architecture |
| Innovation Judge | Evaluates originality and differentiation |
| Impact Judge | Assesses usefulness and feasibility |
| Viva Judge | Conducts technical questioning |

A central AI orchestrator coordinates the agents and combines their findings into a structured evaluation.

### 💻 4. Technical Project Evaluation
- GitHub repository analysis.
- Source-code inspection.
- Architecture and implementation evaluation.
- Automated application testing.
- Verification of claimed functionalities.
- Identification of potential implementation gaps.

### ❓ 5. AI-Powered Viva
- Automatically generates project-specific questions.
- Asks technical questions based on submitted implementations.
- Evaluates participant responses.
- Identifies gaps between claimed and demonstrated knowledge.
- Generates detailed feedback.

### 📊 6. Intelligent Scoring System
- Customisable judging criteria.
- Weighted scoring across evaluation categories.
- Evidence-backed evaluation.
- Team-wise performance comparison.
- Automated leaderboard generation.
- Human judge review and score overrides.

### 🏆 7. Organiser Dashboard
- Monitor ongoing presentations.
- View team submissions and evaluation progress.
- Access individual agent scores.
- Review pitch transcripts and feedback.
- Compare participating teams.
- Manage final rankings.

---

## 🛠️ Technology Stack

Our proposed technology stack combines modern web development, real-time communication and multimodal AI.

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| UI Framework | Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| Real-time Communication | LiveKit, WebRTC |
| AI Orchestration | LangGraph |
| LLM Integration | Gemini API, OpenAI API |
| Speech Processing | Whisper, Speech-to-Text |
| Computer Vision | OpenCV, MediaPipe |
| Code Analysis | GitHub API, Tree-sitter |
| Code Execution | Docker Sandbox |
| Vector Database | Qdrant |
| Main Database | PostgreSQL |
| Caching & Queues | Redis, Celery |
| File Storage | S3-compatible storage |
| Deployment | Docker, AWS / Google Cloud |

*The stack is the intended architecture and may evolve during development.*

---

## 🏗️ System Architecture

```text
              PARTICIPANT PORTAL
                      |
               NEXT.JS FRONTEND
                      |
              FASTAPI BACKEND
                      |
             LIVEKIT / WEBRTC
                      |
             LANGGRAPH ENGINE
                      |
       +--------------+--------------+
       |              |              |
    SPEECH AI       VISION AI      PROJECT AI
       |              |              |
    Transcription   OpenCV        GitHub API
    Speech Metrics  MediaPipe     Docker
       |              |              |
       +--------------+--------------+
                      |
               SPECIALISED AGENTS
                      |
       +--------------+--------------+
       |              |              |
    Pitch Judge   Technical Judge  Innovation
       |              |              |
       +--------------+--------------+
                      |
                VIVA JUDGE
                      |
              SCORING ENGINE
                      |
                POSTGRESQL
                      |
              ORGANISER PANEL
                      |
               LEADERBOARD
```

---

## 📐 Evaluation Criteria

The proposed default judging rubric is:

| Evaluation Category | Weight |
|---|---:|
| Innovation & Originality | 20% |
| Technical Implementation | 25% |
| Problem Solving & Impact | 15% |
| Live Pitch Quality | 15% |
| Presentation & Communication | 10% |
| Technical Viva | 15% |
| **Total** | **100%** |

Organisers can customise the weights depending on the hackathon's theme and requirements.

All scores should be accompanied by supporting observations and evidence. Human judges retain the ability to review and override AI-generated scores.

---

## 🔄 How It Works

1. **Registration:** Teams register and submit their project information.
2. **Project Submission:** Participants provide GitHub repositories, presentations, documentation and demo links.
3. **Pre-Evaluation:** AI agents analyse available project materials.
4. **Live Pitch:** The system processes the presentation through camera, microphone and screen-sharing streams.
5. **AI Viva:** Participants answer automatically generated technical questions.
6. **Technical Verification:** The system inspects source code and tests project functionality in isolated environments.
7. **Final Evaluation:** Specialised agents submit their scores and supporting evidence.
8. **Leaderboard:** Organisers receive consolidated evaluations and rankings.

---

## 🎯 Project Objectives

- Reduce inconsistencies in hackathon evaluation.
- Assist judges in evaluating large numbers of teams.
- Introduce multimodal AI into live project assessment.
- Verify actual project functionality instead of relying only on presentations.
- Encourage transparent and evidence-based scoring.
- Provide constructive feedback to participants.
- Make hackathon judging more scalable and efficient.

---

## 🗺️ Development Roadmap

- [ ] Frontend and organiser dashboard
- [ ] Team registration and submission portal
- [ ] Backend API and database integration
- [ ] Live audio/video integration
- [ ] Real-time speech transcription
- [ ] Pitch quality evaluation
- [ ] Visual presentation analysis
- [ ] GitHub repository analysis
- [ ] Technical project verification
- [ ] AI-powered viva system
- [ ] Multi-agent orchestration
- [ ] Weighted scoring engine
- [ ] Automated leaderboard
- [ ] Complete end-to-end integration
- [ ] Deployment and real-world testing

---

## 🔐 Privacy, Fairness & Responsible AI

Aineerkshak is designed with responsible AI evaluation in mind.

- Participant consent before audio/video processing.
- Secure handling of submitted repositories and personal information.
- Isolated environments for executing submitted code.
- Evidence-backed scoring instead of unsupported AI judgments.
- No scoring based on sensitive personal characteristics.
- Human review and override mechanisms.
- Transparent evaluation criteria.
- Appropriate retention and deletion policies for recordings.

Visual presentation analysis should focus on observable presentation behaviours rather than attempting to infer personality, intelligence or actual confidence from appearance.

---

## 🌟 Our Vision

We envision a future where hackathons can be evaluated with greater consistency, transparency and technical depth.

Aineerkshak is not intended to eliminate human judges. It aims to empower them with an intelligent AI evaluation system that can analyse more evidence, ask better questions and provide meaningful insights.

**We don't just want AI to listen to a pitch. We want AI to understand, investigate and evaluate the project behind it.**

---

## 🤝 Contributing

We welcome contributions, ideas, improvements and collaborations.

If you're interested in AI, machine learning, computer vision, real-time communication, software engineering or hackathon innovation, you're welcome to contribute.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Submit a pull request.

---

## 📄 License

This project is currently under development. Licensing details will be added as the project progresses.

---

<p align="center">
  <strong>AINEERKSHAK</strong><br/>
  <em>Every Idea Deserves a Fair Evaluation.</em>
</p>
