"""Multilingual speech-to-text service with Indian language and Hinglish support."""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Common vocabulary dictionary for natural conversational Hinglish
HINGLISH_VOCAB: dict[str, str] = {
    # Pronouns & Demonstratives
    "हम": "hum",
    "हमारा": "hamara",
    "हमारी": "hamari",
    "हमारे": "hamare",
    "हमने": "humne",
    "मैं": "main",
    "मेरा": "mera",
    "मेरी": "meri",
    "मेरे": "mere",
    "आप": "aap",
    "आपका": "aapka",
    "आपकी": "aapki",
    "आपके": "aapke",
    "आपने": "aapne",
    "तुम": "tum",
    "तुम्हारा": "tumhara",
    "यह": "ye",
    "ये": "ye",
    "वह": "wo",
    "वो": "wo",
    "इस": "is",
    "उस": "us",
    "सब": "sab",
    "कोई": "koi",
    "कुछ": "kuch",
    "क्या": "kya",
    "क्यों": "kyun",
    "कहाँ": "kahan",
    "कब": "kab",
    "कैसे": "kaise",
    "कैसा": "kaisa",
    "कौन": "kaun",

    # Verbs & Auxiliaries
    "है": "hai",
    "हैं": "hain",
    "हो": "ho",
    "हूँ": "hoon",
    "था": "tha",
    "थी": "thi",
    "थे": "the",
    "होगा": "hoga",
    "होगी": "hogi",
    "होंगे": "honge",
    "होता": "hota",
    "होती": "hoti",
    "होते": "hote",
    "करना": "karna",
    "करता": "karta",
    "करती": "karti",
    "करते": "karte",
    "कर": "kar",
    "किया": "kiya",
    "किए": "kiye",
    "की": "ki",
    "करेंगे": "karenge",
    "करेगा": "karega",
    "सकते": "sakte",
    "सकता": "sakta",
    "सकती": "sakti",
    "सके": "sake",
    "बनाया": "banaya",
    "बनाना": "banana",
    "बना": "bana",
    "देना": "dena",
    "देता": "deta",
    "देते": "dete",
    "देती": "deti",
    "दिया": "diya",
    "दिए": "diye",
    "लेना": "lena",
    "लेता": "leta",
    "लेते": "lete",
    "लेती": "leti",
    "लिया": "liya",
    "लिए": "liye",
    "आना": "aana",
    "आया": "aaya",
    "जाना": "jaana",
    "गया": "gaya",
    "गई": "gayi",
    "गए": "gaye",
    "रहा": "raha",
    "रही": "rahi",
    "रहे": "rahe",
    "चल": "chal",
    "चलता": "chalta",
    "चलते": "chalte",
    "चलती": "chalti",
    "लिखा": "likha",
    "लिखी": "likhi",
    "लिखे": "likhe",
    "चाहिए": "chahiye",
    "लगता": "lagta",
    "देखना": "dekhna",

    # Conjunctions & Modifiers
    "और": "aur",
    "या": "ya",
    "लेकिन": "lekin",
    "मगर": "magar",
    "क्योंकि": "kyunki",
    "ताकि": "taaki",
    "इसलिए": "isliye",
    "तो": "toh",
    "भी": "bhi",
    "ही": "hi",
    "तक": "tak",
    "से": "se",
    "में": "me",
    "पे": "pe",
    "पर": "par",
    "का": "ka",
    "के": "ke",
    "को": "ko",
    "ने": "ne",
    "बहुत": "bahut",
    "ज्यादा": "zyada",
    "ज़्यादा": "zyada",
    "कम": "kam",
    "अच्छा": "accha",
    "बड़ा": "bada",
    "नया": "naya",
    "पहला": "pehla",
    "दूसरा": "doosra",
    "सही": "sahi",
    "गलत": "galat",
    "सिर्फ": "sirf",
    "आसान": "aasaan",
    "थ्रू": "through",

    # Technical & Project Terms (Hardware, AI, Blockchain, Cloud, DevOps, Fullstack)
    "प्रोजेक्ट": "project",
    "ब्लॉकचेन": "blockchain",
    "स्मार्ट": "smart",
    "कॉन्ट्रैक्ट्स": "contracts",
    "कॉन्ट्रैक्ट": "contract",
    "ट्रांजैक्शन्स": "transactions",
    "ट्रांजैक्शन": "transaction",
    "डिसेंट्रलाइज्ड": "decentralized",
    "टोकन": "token",
    "टोकन्स": "tokens",
    "कंसेंसस": "consensus",
    "इथेरियम": "Ethereum",
    "आईपीएफएस": "IPFS",
    "पीयर-टू-पीयर": "peer-to-peer",
    "नोड्स": "nodes",
    "गॉसिप": "gossip",
    "प्रूफ्स": "proofs",
    "मॉडल": "model",
    "ट्रेनिंग": "training",
    "इन्फेरेंस": "inference",
    "पायटॉर्च": "PyTorch",
    "मशीन": "machine",
    "लर्निंग": "learning",
    "पाइपलाइन": "pipeline",
    "ऑटोमेटेड": "automated",
    "फीचर": "feature",
    "इंजीनियरिंग": "engineering",
    "नेचुरल": "natural",
    "लैंग्वेज": "language",
    "प्रोसेसिंग": "processing",
    "हिंदी": "Hindi",
    "सेंटीमेंट": "sentiment",
    "एनालाइज": "analyze",
    "कंप्यूटर": "computer",
    "विजन": "vision",
    "फेस": "face",
    "लैंडमार्क्स": "landmarks",
    "वेक्टर": "vector",
    "एम्बेडिंग्स": "embeddings",
    "सिमिलैरिटी": "similarity",
    "डीप": "deep",
    "क्वांटाइजेशन": "quantization",
    "प्रेडिक्टिव": "predictive",
    "एनालिटिक्स": "analytics",
    "फोरकास्ट": "forecast",
    "ऑब्जेक्ट": "object",
    "डिटेक्शन": "detection",
    "योलो": "YOLO",
    "रिकमेंडेशन": "recommendation",
    "एक्यूरेसी": "accuracy",
    "व्हिस्पर": "Whisper",
    "स्पीच": "speech",
    "रिकॉग्निशन": "recognition",
    "ट्रांसक्राइब": "transcribe",
    "प्लेटफॉर्म": "platform",
    "प्लेटफार्म": "platform",
    "सिस्टम": "system",
    "आर्किटेक्चर": "architecture",
    "माइक्रोसर्विसेज": "microservices",
    "डेटाबेस": "database",
    "डेटा": "data",
    "सर्वर": "server",
    "क्लाइंट": "client",
    "एपीआई": "API",
    "एआई": "AI",
    "पोस्टग्रेस": "postgres",
    "एसक्यूलाइट": "SQLite",
    "रेडिस": "Redis",
    "कैशिंग": "caching",
    "कैश": "cache",
    "क्वेरी": "query",
    "क्वेरीज़": "queries",
    "रिस्पॉन्स": "response",
    "टाइम": "time",
    "रिड्यूस": "reduce",
    "बैकएंड": "backend",
    "फ्रंटएंड": "frontend",
    "एसिंक्रोनस": "asynchronous",
    "बैकग्राउंड": "background",
    "वर्कर्स": "workers",
    "सेलेरी": "Celery",
    "इंडेक्सिंग": "indexing",
    "सर्च": "search",
    "स्टोरेज": "storage",
    "ग्राफक्यूएल": "GraphQL",
    "एंडपॉइंट": "endpoint",
    "रिलेशनल": "relational",
    "फॉरेन": "foreign",
    "कंस्ट्रेंट्स": "constraints",
    "इवेंट-ड्रिवन": "event-driven",
    "काफ्का": "Kafka",
    "मैसेज": "message",
    "क्यू": "queue",
    "पायथन": "Python",
    "फास्टएपीआई": "FastAPI",
    "वेबसॉकेट": "WebSocket",
    "कनेक्शन": "connection",
    "डिस्ट्रिब्यूटेड": "distributed",
    "सेशन": "session",
    "स्टेट": "state",
    "डॉकर": "Docker",
    "कंटेनर": "container",
    "कुबेरनेट्स": "Kubernetes",
    "क्लस्टर": "cluster",
    "डिप्लॉय": "deploy",
    "डिप्लॉयमेंट": "deployment",
    "सर्वरलेस": "serverless",
    "फंक्शन्स": "functions",
    "एडब्ल्यूएस": "AWS",
    "लैम्ब्डा": "Lambda",
    "कंकरेंसी": "concurrency",
    "लोड": "load",
    "बैलेंसिंग": "balancing",
    "एनगिंक्स": "Nginx",
    "रिवर्स": "reverse",
    "प्रॉक्सी": "proxy",
    "कंटीन्यूअस": "continuous",
    "इंटीग्रेशन": "integration",
    "एंड": "and",
    "गिटहब": "GitHub",
    "एक्शन्स": "Actions",
    "क्लाउड": "cloud",
    "इन्फ्रास्ट्रक्चर": "infrastructure",
    "टेराफॉर्म": "Terraform",
    "स्क्रिप्ट्स": "scripts",
    "प्रोविजन": "provision",
    "सिक्योरिटी": "security",
    "जेडब्ल्यूटी": "JWT",
    "ऑथेंटिकेशन": "authentication",
    "ओऑथ": "OAuth",
    "बायोमेट्रिक": "biometric",
    "वेरीफिकेशन": "verification",
    "प्राइवेसी": "privacy",
    "रेट": "rate",
    "लिमिटिंग": "limiting",
    "बकेट": "bucket",
    "एन्क्रिप्शन": "encryption",
    "एईएस-256": "AES-256",
    "सेंसिटिव": "sensitive",
    "फ्रॉड": "fraud",
    "ऑफलाइन": "offline",
    "ऑनलाइन": "online",
    "एज": "edge",
    "डिवाइस": "device",
    "ऐप": "app",
    "रियल-टाइम": "real-time",
    "टेलीमेट्री": "telemetry",
    "सेंसर": "sensor",
    "एमक्यूटीटी": "MQTT",
    "प्रोटोकॉल": "protocol",
    "मोबाइल": "mobile",
    "एप्लीकेशन": "application",
    "फ्लटर": "Flutter",
    "फ्रेमवर्क": "framework",
    "ओएनएनएक्स": "ONNX",
    "रनटाइम": "runtime",
    "मेमोरी": "memory",
    "फुटप्रिंट": "footprint",
    "नेक्स्ट.जेएस": "Next.js",
    "टेलविंड": "Tailwind",
    "सीएसएस": "CSS",
    "रिस्पॉन्सिव": "responsive",
    "डार्क": "dark",
    "मोड": "mode",
    "फुल-डुप्लेक्स": "full-duplex",
    "कस्टम": "custom",
    "डैशबोर्ड": "dashboard",
    "मल्टीलिंगुअल": "multilingual",
    "इंग्लिश": "English",
    "हिंग्लिश": "Hinglish",
    "सॉल्यूशन": "solution",
    "हैकाथॉन": "hackathon",
    "इवैल्यूएशन": "evaluation",
    "पायटेस्ट": "Pytest",
    "टेस्ट्स": "tests",
    "यूनिट": "unit",
    "सुइट": "suite",
    "यूज़": "use",
    "रन": "run",
    "फास्ट": "fast",
    "सब-10ms": "sub-10ms",
    "लेटेंसी": "latency",
    "डिटेक्ट": "detect",
    "कैप्चर": "capture",
    "बेस्ड": "based",
    "परफॉर्म": "perform",
    "सेटअप": "setup",
    "होस्ट": "host",
    "स्ट्रीम": "stream",
    "डेवलप": "develop",
    "जीरो": "zero",
    "नॉलेज": "knowledge",
    "प्रिजर्व": "preserve",
    "डिजाइन": "design",
    "कॉन्फिगर": "configure",
    "मेंटेन": "maintain",
    "सपोर्ट": "support",
    "स्टोर": "store",
    "प्रोवाइड": "provide",
    "प्रोटेक्ट": "protect",
    "स्पीड": "speed",
    "ट्रिपल": "triple",
    "ओपन": "open",
    "सोर्स": "source",
    "लाइब्रेरीज़": "libraries",
    "सिंक": "sync",
    "कवर": "cover",
    "फ्यूचर": "future",
    "सेल्स": "sales",
    "कैलकुलेट": "calculate",
    "इमेज": "image",
    "कम्प्रेशन": "compression",
    "साइज": "size",
    "परसेंट": "percent",
    "कम्प्रेस": "compress",
    "पर्सिस्ट": "persist",
    "इम्प्रूव": "improve",
    "ऑटोमेट": "automate",
    "कम्प्लीटली": "completely",
    "इम्प्लीमेंट": "implement",
    "इम्प्लीमेंटेशन": "implementation",
    "यूजर": "user",
    "यूज़र्स": "users",
    "कोड": "code",
    "फाइल": "file",
    "कैमरा": "camera",
    "जज": "judge",
    "जजिंग": "judging",
    "टीम": "team",
    "राउंड": "round",
    "लोकल": "local",
    "हाई": "high",
    "लो": "low",
    "फ्रेम्स": "frames",
    "सेकंड": "second",
    "फीडबैक": "feedback",
    "लूप": "loop",
    "इंजन": "engine",
    "प्रोसेस": "process",
    "एल्गोरिदम": "algorithm",
    "लाइव": "live",
    "कम्युनिकेशन": "communication",
    "साइड": "side",
    "वेरिफिकेशन": "verification",
    "करके": "karke",
    "वेरीफाई": "verify",
    "नेटवर्क": "network",
    "लगाया": "lagaya",
    "ऑडियो": "audio",
    "वेब": "web",
    "क्रॉस-प्लेटफॉर्म": "cross-platform",
    "टेस्ट": "test",
    "60": "60",
    "80": "80",
}

DEVA_VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
    "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "an",
}

DEVA_MATRAS = {
    "ा": "a", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ँ": "n",
    "ः": "h", "्": "", "ॉ": "o", "ॅ": "e",
}

DEVA_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "d", "ढ़": "dh", "फ़": "f",
}


PHRASE_MAPPINGS: dict[str, str] = {
    "फॉरेन की": "foreign key",
    "रियल-टाइम": "real-time",
    "रियल टाइम": "real-time",
    "पीयर-टू-पीयर": "peer-to-peer",
    "पीयर टू पीयर": "peer-to-peer",
    "क्रॉस-प्लेटफॉर्म": "cross-platform",
    "क्रॉस प्लेटफॉर्म": "cross-platform",
    "इवेंट-ड्रिवन": "event-driven",
    "इवेंट ड्रिवन": "event-driven",
    "फुल-डुप्लेक्स": "full-duplex",
    "फुल डुप्लेक्स": "full-duplex",
    "पर सेकंड": "per second",
    "नेक्स्ट.जेएस": "Next.js",
    "नेक्स्ट जेएस": "Next.js",
    "सब-10ms": "sub-10ms",
    "सब 10ms": "sub-10ms",
    "एईएस-256": "AES-256",
    "एईएस 256": "AES-256",
}


def has_devanagari(text: str) -> bool:
    """Return True if text contains characters in Devanagari range U+0900-U+097F."""
    return bool(re.search(r"[\u0900-\u097F]", text))


def transliterate_to_hinglish(text: str) -> str:
    """Deterministic conversion of Devanagari text into clean Roman Hinglish.

    Guarantees that 0% Devanagari characters remain in output.
    """
    if not text or not has_devanagari(text):
        return text

    # Pre-process multi-word and hyphenated phrases
    processed_text = text
    for phrase, rep in PHRASE_MAPPINGS.items():
        if phrase in processed_text:
            processed_text = processed_text.replace(phrase, rep)

    # Split into words preserving punctuation
    tokens = re.split(r"([ \t\n\r,.!?;:\"'()\[\]{}]+)", processed_text)
    result_tokens = []

    for token in tokens:
        if not token or not has_devanagari(token):
            result_tokens.append(token)
            continue

        trimmed = token.strip()
        if trimmed in HINGLISH_VOCAB:
            result_tokens.append(HINGLISH_VOCAB[trimmed])
            continue

        # Character by character phonetic transliteration
        chars = list(trimmed)
        out = ""
        length = len(chars)

        i = 0
        while i < length:
            c = chars[i]
            next_c = chars[i + 1] if i + 1 < length else ""

            if c in DEVA_VOWELS:
                out += DEVA_VOWELS[c]
            elif c in DEVA_CONSONANTS:
                base = DEVA_CONSONANTS[c]
                if next_c == "्":  # Halant
                    out += base
                    i += 1  # Skip halant
                elif next_c in DEVA_MATRAS:
                    out += base + DEVA_MATRAS[next_c]
                    i += 1  # Skip matra
                elif i == length - 1:
                    # Final consonant schwa deletion
                    out += base
                else:
                    out += base + "a"
            elif c in DEVA_MATRAS:
                out += DEVA_MATRAS[c]
            else:
                out += c
            i += 1

        result_tokens.append(out)

    res = "".join(result_tokens)

    # Post-check: ensure 0% Devanagari remains
    if has_devanagari(res):
        res = re.sub(r"[\u0900-\u097F]", "", res)

    # Clean double vowels artifacts
    res = re.sub(r"aa+", "aa", res)
    res = re.sub(r"ee+", "ee", res)
    res = re.sub(r"oo+", "oo", res)
    return res


class SpeechRecognitionService:
    """Handles multilingual speech transcription with strict support for Hindi, English, and Hinglish."""

    def __init__(self) -> None:
        self.supported_languages = ["hi", "en", "hinglish"]

    def detect_language(self, text: str) -> str:
        """Detect language of text between English, Hindi (Devanagari), and Hinglish (Romanised Hindi)."""
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
        total_letters = len(re.findall(r"[a-zA-Z\u0900-\u097F]", text))

        if total_letters == 0:
            return "en"

        if devanagari_count / total_letters > 0.3:
            return "hi"

        hinglish_keywords = {
            "hum", "humne", "hamara", "aap", "karna", "kiya", "karenge",
            "yeh", "woh", "hai", "hain", "tha", "the", "bhi", "aur", "lekin",
            "kyunki", "kuch", "sabse", "accha", "bahut", "kaise", "kya", "toh",
            "banaya", "chahiye", "sakte", "chal", "raha", "wala", "wali", "project",
        }
        words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        hinglish_matches = sum(1 for w in words if w in hinglish_keywords)

        if len(words) > 0 and (hinglish_matches / len(words)) >= 0.15:
            return "hinglish"

        return "en"

    def process_transcription(
        self,
        raw_text: str,
        speaker: str = "participant",
        confidence: float = 0.95,
        target_mode: str | None = None,
    ) -> dict[str, Any]:
        """Process transcribed speech chunk, enforce language script rules, and prepare caption data."""
        clean_text = raw_text.strip()
        detected_lang = self.detect_language(clean_text)

        effective_lang = target_mode if target_mode in ("hi", "en", "hinglish") else detected_lang

        # Enforce Hinglish script rule: Roman Latin only, NEVER Devanagari
        if effective_lang == "hinglish":
            romanized = transliterate_to_hinglish(clean_text)
            display_content = romanized
        elif effective_lang == "hi":
            display_content = clean_text
            romanized = transliterate_to_hinglish(clean_text)
        else:
            display_content = clean_text
            romanized = clean_text

        return {
            "speaker": speaker,
            "content": display_content,
            "original_content": clean_text,
            "language": effective_lang,
            "romanized_content": romanized,
            "confidence": confidence,
            "is_correction": False,
        }

    def apply_correction(
        self,
        original_content: str,
        corrected_content: str,
        corrected_by: str = "participant",
        target_mode: str = "hi",
    ) -> dict[str, Any]:
        """Apply manual or spoken correction to a prior transcript entry."""
        clean_corrected = corrected_content.strip()
        if target_mode == "hinglish":
            clean_corrected = transliterate_to_hinglish(clean_corrected)

        return {
            "original_content": original_content,
            "corrected_content": clean_corrected,
            "corrected_by": corrected_by,
            "language": target_mode,
            "is_correction": True,
            "confidence": 1.0,
        }
