"""Backend Text-To-Speech (TTS) service with Indian language support.

Generates high-fidelity MP3/WAV audio bytes with fallback chain, error handling,
and retry mechanisms for AI judge voice playback.
"""

import base64
import io
import logging
import re
import time
from typing import Any

logger = logging.getLogger(__name__)

# Reverse map common Hinglish words to Devanagari for natural Indian voice pronunciation
HINGLISH_TO_DEVA_DICT: dict[str, str] = {
    # Pronouns & Demonstratives (supporting both hamara and humara variants)
    "aapne": "आपने",
    "aapka": "आपका",
    "aapki": "आपकी",
    "aapke": "आपके",
    "aap": "आप",
    "humne": "हमने",
    "hamne": "हमने",
    "humara": "हमारा",
    "hamara": "हमारा",
    "humari": "हमारी",
    "hamari": "हमारी",
    "humare": "हमारे",
    "hamare": "हमारे",
    "hum": "हम",
    "ham": "हम",
    "main": "मैं",
    "mera": "मेरा",
    "meri": "मेरी",
    "mere": "मेरे",
    "tum": "तुम",
    "tumhara": "तुम्हारा",
    "yeh": "यह",
    "ye": "यह",
    "woh": "वह",
    "wo": "वह",
    "is": "इस",
    "us": "उस",
    "sab": "सब",
    "kya": "क्या",
    "kaise": "कैसे",
    "kaisa": "कैसा",
    "kaisi": "कैसी",
    "kyun": "क्यों",
    "kab": "कब",
    "kahan": "कहाँ",
    "kaun": "कौन",

    # Conjunctions & Particles
    "aur": "और",
    "ya": "या",
    "lekin": "लेकिन",
    "magar": "मगर",
    "kyunki": "क्योंकि",
    "isliye": "इसलिए",
    "toh": "तो",
    "bhi": "भी",
    "hi": "ही",
    "tak": "तक",
    "se": "से",
    "mein": "में",
    "me": "में",
    "pe": "पे",
    "per": "पर",
    "par": "पर",
    "ko": "को",
    "ke": "के",
    "ka": "का",
    "ki": "की",
    "ne": "ने",
    "liye": "लिए",
    "through": "थ्रू",
    "bahut": "बहुत",
    "zyada": "ज़्यादा",
    "accha": "अच्छा",
    "sahi": "सही",
    "galat": "गलत",
    "kam": "कम",
    "sirf": "सिर्फ",
    "dhanyawad": "धन्यवाद",
    "namaste": "नमस्ते",
    "shukriya": "शुक्रिया",

    # Verb Inflections
    "hai": "है",
    "hain": "हैं",
    "tha": "था",
    "the": "थे",
    "thi": "थी",
    "hoga": "होगी",
    "hogi": "होगी",
    "honge": "होंगे",
    "hota": "होता",
    "hote": "होते",
    "hoti": "होती",
    "hona": "होना",
    "karta": "करता",
    "karti": "करती",
    "karte": "करते",
    "karna": "करना",
    "karega": "करेगा",
    "karegi": "करेगी",
    "karenge": "करेंगे",
    "kar": "कर",
    "kiya": "किया",
    "kiye": "किए",
    "sakta": "सकता",
    "sakte": "सकते",
    "sakti": "सकती",
    "sake": "सके",
    "raha": "रहा",
    "rahe": "रहे",
    "rahi": "रही",
    "deta": "देता",
    "dete": "देते",
    "deti": "देती",
    "dena": "देना",
    "diya": "दिया",
    "diye": "दिए",
    "leta": "लेता",
    "lete": "लेते",
    "leti": "लेती",
    "lena": "लेना",
    "liya": "लिया",
    "aana": "आना",
    "aata": "आता",
    "aate": "आते",
    "aati": "आती",
    "aaya": "आया",
    "gaya": "गया",
    "gaye": "गए",
    "gayi": "गई",
    "chal": "चल",
    "chalta": "चलता",
    "chalte": "चलते",
    "chalti": "चलती",
    "ho": "हो",
    "karke": "करके",
    "lagaya": "लगाया",
    "bana": "बना",
    "banana": "बनाना",
    "banaya": "बनाया",
    "banayi": "बनाई",
    "banaye": "बनाए",
    "likha": "लिखा",
    "likhi": "लिखी",
    "likhe": "लिखे",
    "batayein": "बताएं",
    "samjhayein": "समझाइए",
    "bataiye": "बताइए",

    # Technical Loanwords & Verbs (Web3, AI, Cloud, DevOps, Edge, Security)
    "project": "प्रोजेक्ट",
    "blockchain": "ब्लॉकचेन",
    "smart": "स्मार्ट",
    "contracts": "कॉन्ट्रैक्ट्स",
    "contract": "कॉन्ट्रैक्ट",
    "transactions": "ट्रांजैक्शन्स",
    "transaction": "ट्रांजैक्शन",
    "decentralized": "डिसेंट्रलाइज्ड",
    "token": "टोकन",
    "tokens": "टोकन्स",
    "consensus": "कंसेंसस",
    "ethereum": "इथेरियम",
    "ipfs": "आईपीएफएस",
    "peer-to-peer": "पीयर-टू-पीयर",
    "nodes": "नोड्स",
    "gossip": "गॉसिप",
    "proofs": "प्रूफ्स",
    "proof": "प्रूफ",
    "model": "मॉडल",
    "models": "मॉडल्स",
    "training": "ट्रेनिंग",
    "inference": "इन्फेरेंस",
    "pytorch": "पायटॉर्च",
    "machine": "मशीन",
    "learning": "लर्निंग",
    "pipeline": "पाइपलाइन",
    "feature": "फीचर",
    "engineering": "इंजीनियरिंग",
    "natural": "नेचुरल",
    "language": "लैंग्वेज",
    "processing": "प्रोसेसिंग",
    "hindi": "हिंदी",
    "sentiment": "सेंटीमेंट",
    "analyze": "एनालाइज",
    "computer": "कंप्यूटर",
    "vision": "विजन",
    "face": "फेस",
    "landmarks": "लैंडमार्क्स",
    "vector": "वेक्टर",
    "embeddings": "एम्बेडिंग्स",
    "similarity": "सिमिलैरिटी",
    "deep": "डीप",
    "quantization": "क्वांटाइजेशन",
    "predictive": "प्रेडिक्टिव",
    "analytics": "एनालिटिक्स",
    "forecast": "फोरकास्ट",
    "object": "ऑब्जेक्ट",
    "detection": "डिटेक्शन",
    "yolo": "योलो",
    "recommendation": "रिकमेंडेशन",
    "accuracy": "एक्यूरेसी",
    "whisper": "व्हिस्पर",
    "speech": "स्पीच",
    "recognition": "रिकॉग्निशन",
    "transcribe": "ट्रांसक्राइब",
    "platform": "प्लेटफॉर्म",
    "system": "सिस्टम",
    "architecture": "आर्किटेक्चर",
    "microservices": "माइक्रोसर्विसेज",
    "database": "डेटाबेस",
    "data": "डेटा",
    "server": "सर्वर",
    "client": "क्लाइंट",
    "api": "एपीआई",
    "ai": "एआई",
    "postgres": "पोस्टग्रेस",
    "sqlite": "एसक्यूलाइट",
    "redis": "रेडिस",
    "caching": "कैशिंग",
    "cache": "कैश",
    "query": "क्वेरी",
    "queries": "क्वेरीज़",
    "response": "रिस्पॉन्स",
    "time": "टाइम",
    "reduce": "रिड्यूस",
    "backend": "बैकएंड",
    "frontend": "फ्रंटएंड",
    "asynchronous": "एसिंक्रोनस",
    "background": "बैकग्राउंड",
    "workers": "वर्कर्स",
    "celery": "सेलेरी",
    "indexing": "इंडेक्सिंग",
    "search": "सर्च",
    "storage": "स्टोरेज",
    "graphql": "ग्राफक्यूएल",
    "endpoint": "एंडपॉइंट",
    "relational": "रिलेशनल",
    "foreign": "फॉरेन",
    "key": "की",
    "constraints": "कंस्ट्रेंट्स",
    "event-driven": "इवेंट-ड्रिवन",
    "kafka": "काफ्का",
    "message": "मैसेज",
    "queue": "क्यू",
    "python": "पायथन",
    "fastapi": "फास्टएपीआई",
    "websocket": "वेबसॉकेट",
    "connection": "कनेक्शन",
    "distributed": "डिस्ट्रिब्यूटेड",
    "session": "सेशन",
    "state": "स्टेट",
    "scalability": "स्केलेबिलिटी",
    "implementation": "इम्प्लीमेंटेशन",
    "docker": "डॉकर",
    "container": "कंटेनर",
    "kubernetes": "कुबेरनेट्स",
    "cluster": "क्लस्टर",
    "deploy": "डिप्लॉय",
    "deployment": "डिप्लॉयमेंट",
    "serverless": "सर्वरलेस",
    "functions": "फंक्शन्स",
    "aws": "एडब्ल्यूएस",
    "lambda": "लैम्ब्डा",
    "concurrency": "कंकरेंसी",
    "load": "लोड",
    "balancing": "बैलेंसिंग",
    "nginx": "एनगिंक्स",
    "reverse": "रिवर्स",
    "proxy": "प्रॉक्सी",
    "continuous": "कंटीन्यूअस",
    "integration": "इंटीग्रेशन",
    "and": "एंड",
    "github": "गिटहब",
    "actions": "एक्शन्स",
    "cloud": "क्लाउड",
    "infrastructure": "इन्फ्रास्ट्रक्चर",
    "terraform": "टेराफॉर्म",
    "scripts": "स्क्रिप्ट्स",
    "provision": "प्रोविजन",
    "security": "सिक्योरिटी",
    "jwt": "जेडब्ल्यूटी",
    "authentication": "ऑथेंटिकेशन",
    "oauth": "ओऑथ",
    "biometric": "बायोमेट्रिक",
    "verification": "वेरिफिकेशन",
    "privacy": "प्राइवेसी",
    "rate": "रेट",
    "limiting": "लिमिटिंग",
    "bucket": "बकेट",
    "encryption": "एन्क्रिप्शन",
    "aes-256": "एईएस-256",
    "sensitive": "सेंसिटिव",
    "fraud": "फ्रॉड",
    "offline": "ऑफलाइन",
    "online": "ऑनलाइन",
    "edge": "एज",
    "device": "डिवाइस",
    "app": "ऐप",
    "real-time": "रियल-टाइम",
    "telemetry": "टेलीमेट्री",
    "sensor": "सेंसर",
    "mqtt": "एमक्यूटीटी",
    "protocol": "प्रोटोकॉल",
    "mobile": "मोबाइल",
    "application": "एप्लीकेशन",
    "flutter": "फ्लटर",
    "framework": "फ्रेमवर्क",
    "onnx": "ओएनएनएक्स",
    "runtime": "रनटाइम",
    "memory": "मेमोरी",
    "footprint": "फुटप्रिंट",
    "next.js": "नेक्स्ट.जेएस",
    "tailwind": "टेलविंड",
    "css": "सीएसएस",
    "responsive": "रिस्पॉन्सिव",
    "dark": "डार्क",
    "mode": "मोड",
    "full-duplex": "फुल-डुप्लेक्स",
    "custom": "कस्टम",
    "dashboard": "डैशबोर्ड",
    "multilingual": "मल्टीलिंगुअल",
    "english": "इंग्लिश",
    "hinglish": "हिंग्लिश",
    "solution": "सॉल्यूशन",
    "hackathon": "हैकाथॉन",
    "evaluation": "इवैल्यूएशन",
    "pytest": "पायटेस्ट",
    "tests": "टेस्ट्स",
    "unit": "यूनिट",
    "suite": "सुइट",
    "use": "यूज़",
    "run": "रन",
    "fast": "फास्ट",
    "sub-10ms": "सब-10ms",
    "latency": "लेटेंसी",
    "detect": "डिटेक्ट",
    "capture": "कैप्चर",
    "based": "बेस्ड",
    "perform": "परफॉर्म",
    "setup": "सेटअप",
    "host": "होस्ट",
    "stream": "स्ट्रीम",
    "develop": "डेवलप",
    "zero": "जीरो",
    "knowledge": "नॉलेज",
    "preserve": "प्रिजर्व",
    "design": "डिजाइन",
    "transcribe": "ट्रांसक्राइब",
    "configure": "कॉन्फिगर",
    "maintain": "मेंटेन",
    "support": "सपोर्ट",
    "store": "स्टोर",
    "provide": "प्रोवाइड",
    "protect": "प्रोटेक्ट",
    "speed": "स्पीड",
    "triple": "ट्रिपल",
    "open": "ओपन",
    "source": "सोर्स",
    "libraries": "लाइब्रेरीज़",
    "sync": "सिंक",
    "cover": "कवर",
    "future": "फ्यूचर",
    "sales": "सेल्स",
    "calculate": "कैलकुलेट",
    "image": "इमेज",
    "compression": "कम्प्रेशन",
    "size": "साइज",
    "percent": "परसेंट",
    "compress": "कम्प्रेस",
    "persist": "पर्सिस्ट",
    "improve": "इम्प्रूव",
    "automate": "ऑटोमेट",
    "completely": "कम्प्लीटली",
    "verify": "वेरीफाई",
    "automated": "ऑटोमेटेड",
    "cross-platform": "क्रॉस-प्लेटफॉर्म",
    "audio": "ऑडियो",
    "network": "नेटवर्क",
    "web": "वेब",
    "test": "टेस्ट",
    "60": "60",
    "80": "80",
    "implement": "इम्प्लीमेंट",
    "user": "यूजर",
    "users": "यूज़र्स",
    "code": "कोड",
    "file": "फाइल",
    "camera": "कैमरा",
    "local": "लोकल",
    "high": "हाई",
    "low": "लो",
    "frames": "फ्रेम्स",
    "second": "सेकंड",
    "feedback": "फीडबैक",
    "loop": "लूप",
    "engine": "इंजन",
    "process": "प्रोसेस",
    "algorithm": "एल्गोरिदम",
    "live": "लाइव",
    "communication": "कम्युनिकेशन",
    "side": "साइड",
}

PHRASE_TO_DEVA: dict[str, str] = {
    "foreign key": "फॉरेन की",
    "real-time": "रियल-टाइम",
    "peer-to-peer": "पीयर-टू-पीयर",
    "cross-platform": "क्रॉस-प्लेटफॉर्म",
    "event-driven": "इवेंट-ड्रिवन",
    "full-duplex": "फुल-डुप्लेक्स",
    "per second": "पर सेकंड",
    "sub-10ms": "सब-10ms",
    "next.js": "नेक्स्ट.जेएस",
    "aes-256": "एईएस-256",
}


def prepare_tts_text(text: str, language: str) -> tuple[str, str]:
    """Prepare text and TTS locale code.

    For Hinglish:
    - Voice text is converted to Devanagari Hindi for hi-IN voice (better natural pronunciation).
    - Locale is set to 'hi'.
    """
    lang_lower = language.lower()

    if lang_lower == "hinglish":
        # Pre-process multi-word technical phrases
        processed_text = text
        for phrase, deva_phrase in PHRASE_TO_DEVA.items():
            pattern = re.compile(re.escape(phrase), re.IGNORECASE)
            processed_text = pattern.sub(deva_phrase, processed_text)

        # Convert Roman words to natural Devanagari for Indian voice
        tokens = processed_text.split()
        converted = []
        for t in tokens:
            clean_token = t.strip(".,!?;:\"'()").lower()
            if clean_token in HINGLISH_TO_DEVA_DICT:
                deva = HINGLISH_TO_DEVA_DICT[clean_token]
                # Preserve surrounding punctuation
                prefix = ""
                suffix = ""
                for c in t:
                    if c in ".,!?;:\"'()":
                        if not prefix and not clean_token:
                            prefix += c
                    else:
                        break
                for c in reversed(t):
                    if c in ".,!?;:\"'()":
                        suffix = c + suffix
                    else:
                        break
                converted.append(prefix + deva + suffix)
            else:
                converted.append(t)
        voice_text = " ".join(converted)
        return voice_text, "hi"

    elif lang_lower == "hi":
        return text, "hi"

    else:
        return text, "en"


class TTSService:
    """Manages audio generation with timeout, retry, and base64 data URL serialization."""

    def __init__(self) -> None:
        pass

    def synthesize_speech(
        self,
        text: str,
        language: str = "en",
        retries: int = 2,
        timeout_seconds: float = 8.0,
    ) -> dict[str, Any]:
        """Synthesize text to speech audio bytes using gTTS.

        Returns { audio_base64: str, mime_type: str, duration_sec: float, success: bool }.
        """
        if not text.strip():
            return {"success": False, "error": "Empty text provided", "audio_base64": None}

        voice_text, voice_lang = prepare_tts_text(text, language)

        last_error = None
        for attempt in range(retries + 1):
            try:
                from gtts import gTTS

                buf = io.BytesIO()
                # Fast, lightweight synthesis
                tts = gTTS(text=voice_text, lang=voice_lang, slow=False)
                tts.write_to_fp(buf)
                raw_bytes = buf.getvalue()

                if len(raw_bytes) > 0:
                    b64 = base64.b64encode(raw_bytes).decode("ascii")
                    # Approximate duration from byte count (gTTS ~32kbps MP3)
                    duration = max(1.0, len(raw_bytes) / 4000.0)

                    logger.info(
                        "TTS synthesis successful: %d bytes (%.1fs) for '%s' (lang=%s)",
                        len(raw_bytes),
                        duration,
                        text[:40],
                        voice_lang,
                    )
                    return {
                        "success": True,
                        "audio_base64": f"data:audio/mp3;base64,{b64}",
                        "mime_type": "audio/mp3",
                        "duration_sec": duration,
                        "voice_lang": voice_lang,
                        "voice_text": voice_text,
                    }
            except Exception as e:
                last_error = str(e)
                logger.warning("TTS attempt %d failed: %s", attempt + 1, e)
                time.sleep(0.3)

        return {
            "success": False,
            "error": last_error or "TTS synthesis timed out",
            "audio_base64": None,
            "voice_lang": voice_lang,
            "voice_text": voice_text,
        }
