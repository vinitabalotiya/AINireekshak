/**
 * Deterministic Devanagari to Roman Hinglish Transliteration Engine
 * Converts Devanagari Hindi speech recognition output into clean, natural Roman Hinglish.
 * Ensures 0% Devanagari characters remain in Hinglish captions.
 */

// Common vocabulary dictionary for natural conversational Hinglish
const HINGLISH_DICTIONARY: Record<string, string> = {
  // Pronouns & Demonstratives
  "हम": "hum",
  "हमारा": "hamara",
  "हमारी": "hamari",
  "हमारे": "hamare",
  "हमने": "humne",
  "मैं": "main",
  "मेरा": "mera",
  "मेरी": "meri",
  "मेरे": "mere",
  "मुझको": "mujhko",
  "मुझे": "mujhe",
  "आप": "aap",
  "आपका": "aapka",
  "आपकी": "aapki",
  "आपके": "aapke",
  "आपने": "aapne",
  "तुम": "tum",
  "तुम्हारा": "tumhara",
  "तुम्हारी": "tumhari",
  "तुम्हारे": "tumhare",
  "यह": "ye",
  "ये": "ye",
  "वह": "wo",
  "वो": "wo",
  "इस": "is",
  "इसको": "isko",
  "इसे": "ise",
  "उस": "us",
  "उसको": "usko",
  "उसे": "use",
  "इन": "in",
  "उन": "un",
  "उनका": "unka",
  "इनका": "inka",
  "सब": "sab",
  "सबका": "sabka",
  "कोई": "koi",
  "कुछ": "kuch",
  "क्या": "kya",
  "क्यों": "kyun",
  "कहाँ": "kahan",
  "कहा": "kaha",
  "कब": "kab",
  "कैसे": "kaise",
  "कैसा": "kaisa",
  "कैसी": "kaisi",
  "कौन": "kaun",
  "किस": "kis",
  "किसने": "kisne",
  "किसका": "kiska",

  // Verbs & Auxiliaries
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
  "करेगी": "karegi",
  "सकते": "sakte",
  "सकता": "sakta",
  "सकती": "sakti",
  "सके": "sake",
  "सकेंगे": "sakenge",
  "पाना": "paana",
  "पाया": "paaya",
  "बनाया": "banaya",
  "बनाई": "banayi",
  "बनाए": "banaye",
  "बनाना": "banana",
  "बना": "bana",
  "देना": "dena",
  "दिया": "diya",
  "दिए": "diye",
  "देंगे": "denge",
  "लेना": "lena",
  "लिया": "liya",
  "लिए": "liye",
  "लेंगे": "lenge",
  "आना": "aana",
  "आया": "aaya",
  "आए": "aaye",
  "जाना": "jaana",
  "गया": "gaya",
  "गई": "gayi",
  "गए": "gaye",
  "जाएगा": "jaayega",
  "जाएगी": "jaayegi",
  "जाएंगे": "jaayenge",
  "रहा": "raha",
  "रही": "rahi",
  "रहे": "rahe",
  "रहना": "rahna",
  "चाहिए": "chahiye",
  "लगता": "lagta",
  "लगती": "lagti",
  "लगा": "laga",
  "लगी": "lagi",
  "देखना": "dekhna",
  "देखा": "dekha",
  "देख": "dekh",
  "सुनना": "sunna",
  "सुना": "suna",
  "बोलना": "bolna",
  "बोला": "bola",

  // Conjunctions & Particles
  "और": "aur",
  "तथा": "tatha",
  "एवं": "evam",
  "या": "ya",
  "अथवा": "athwa",
  "लेकिन": "lekin",
  "मगर": "magar",
  "किन्तु": "kintu",
  "परन्तु": "parantu",
  "पर": "par",
  "क्योंकि": "kyunki",
  "ताकि": "taaki",
  "इसलिए": "isliye",
  "तो": "toh",
  "भी": "bhi",
  "ही": "hi",
  "तक": "tak",
  "से": "se",
  "में": "mein",
  "पे": "pe",
  "का": "ka",
  "के": "ke",
  "को": "ko",
  "ने": "ne",
  "द्वारा": "dwara",
  "के लिए": "ke liye",
  "के साथ": "ke saath",
  "के बाद": "ke baad",
  "के पहले": "ke pehle",
  "के अंदर": "ke andar",
  "के बाहर": "ke baahar",

  // Adjectives, Adverbs & Modifiers
  "बहुत": "bahut",
  "ज्यादा": "zyada",
  "कम": "kam",
  "अच्छा": "accha",
  "अच्छी": "acchi",
  "अच्छे": "acche",
  "बड़ा": "bada",
  "बड़ी": "badi",
  "बड़े": "bade",
  "छोटा": "chota",
  "छोटी": "choti",
  "छोटे": "chote",
  "नया": "naya",
  "नई": "nayi",
  "नए": "naye",
  "पुराना": "purana",
  "पहला": "pehla",
  "पहली": "pehli",
  "पहले": "pehle",
  "दूसरा": "doosra",
  "दूसरे": "doosre",
  "तीसरा": "teesra",
  "सही": "sahi",
  "गलत": "galat",
  "तेज़": "tez",
  "धीरे": "dheere",
  "जल्दी": "jaldi",
  "अभी": "abhi",
  "आज": "aaj",
  "कल": "kal",
  "हमेशा": "hamesha",
  "कभी": "kabhi",
  "सिर्फ": "sirf",
  "केवल": "kewal",
  "खास": "khaas",
  "मुख्य": "mukhya",
  "आसानी": "aasaani",
  "आसान": "aasaan",
  "मुश्किल": "mushkil",

  // Technical & Domain Terms (frequently spoken in Devanagari by STT)
  "प्रोजेक्ट": "project",
  "बेस्ड": "based",
  "बेसड": "based",
  "एआई": "AI",
  "प्लेटफॉर्म": "platform",
  "प्लेटफार्म": "platform",
  "सिस्टम": "system",
  "आर्किटेक्चर": "architecture",
  "मॉडल": "model",
  "डेटा": "data",
  "डेटाबेस": "database",
  "सर्वर": "server",
  "क्लाइंट": "client",
  "एपीआई": "API",
  "यूजर": "user",
  "यूज़र्स": "users",
  "ऐप": "app",
  "एप्लीकेशन": "application",
  "वेबसाइट": "website",
  "इंटरफेस": "interface",
  "सॉफ्टवेयर": "software",
  "हार्डवेयर": "hardware",
  "नेटवर्क": "network",
  "इंटरनेट": "internet",
  "कनेक्शन": "connection",
  "फीचर": "feature",
  "फीचर्स": "features",
  "कोड": "code",
  "फाइल": "file",
  "इमेज": "image",
  "वीडियो": "video",
  "ऑडियो": "audio",
  "कैमरा": "camera",
  "स्क्रीन": "screen",
  "बटन": "button",
  "क्लिक": "click",
  "सर्च": "search",
  "रिजल्ट": "result",
  "रिजल्ट्स": "results",
  "स्कोर्स": "scores",
  "स्कोर": "score",
  "टेस्ट": "test",
  "टेस्टिंग": "testing",
  "एरर": "error",
  "बग": "bug",
  "प्रॉब्लम": "problem",
  "सॉल्यूशन": "solution",
  "परफॉरमेंस": "performance",
  "सिक्योरिटी": "security",
  "ऑथेंटिकेशन": "authentication",
  "लॉगिन": "login",
  "साइनअप": "signup",
  "पासवर्ड": "password",
  "टोकन": "token",
  "कैश": "cache",
  "मेमोरी": "memory",
  "स्टोरेज": "storage",
  "क्लाउड": "cloud",
  "लोकल": "local",
  "ऑफलाइन": "offline",
  "ऑनलाइन": "online",
  "इम्प्लीमेंट": "implement",
  "इम्प्लीमेंटेशन": "implementation",
  "इंटीग्रेशन": "integration",
  "प्रोसेसिंग": "processing",
  "एनालिसिस": "analysis",
  "इवैल्यूएशन": "evaluation",
  "हैकाथॉन": "hackathon",
  "जज": "judge",
  "जजिंग": "judging",
  "टीम": "team",
  "राउंड": "round",
  "फाइनल": "final",

  // Advanced Technical Vocabulary (Web3, AI, Cloud, DevOps, Edge, Security)
  "ब्लॉकचेन": "blockchain",
  "स्मार्ट": "smart",
  "कॉन्ट्रैक्ट्स": "contracts",
  "कॉन्ट्रैक्ट": "contract",
  "ट्रांजैक्शन्स": "transactions",
  "ट्रांजैक्शन": "transaction",
  "डिसेंट्रलाइज्ड": "decentralized",
  "टोकन्स": "tokens",
  "कंसेंसस": "consensus",
  "इथेरियम": "Ethereum",
  "आईपीएफएस": "IPFS",
  "पीयर-टू-पीयर": "peer-to-peer",
  "नोड्स": "nodes",
  "गॉसिप": "gossip",
  "प्रूफ्स": "proofs",
  "ट्रेनिंग": "training",
  "इन्फेरेंस": "inference",
  "पायटॉर्च": "PyTorch",
  "मशीन": "machine",
  "लर्निंग": "learning",
  "पाइपलाइन": "pipeline",
  "ऑटोमेटेड": "automated",
  "नेचुरल": "natural",
  "लैंग्वेज": "language",
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
  "माइक्रोसर्विसेज": "microservices",
  "पोस्टग्रेस": "postgres",
  "एसक्यूलाइट": "SQLite",
  "रेडिस": "Redis",
  "कैशिंग": "caching",
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
  "गिटहब": "GitHub",
  "एक्शन्स": "Actions",
  "टेराफॉर्म": "Terraform",
  "स्क्रिप्ट्स": "scripts",
  "प्रोविजन": "provision",
  "जेडब्ल्यूटी": "JWT",
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
  "एज": "edge",
  "डिवाइस": "device",
  "रियल-टाइम": "real-time",
  "टेलीमेट्री": "telemetry",
  "सेंसर": "sensor",
  "एमक्यूटीटी": "MQTT",
  "प्रोटोकॉल": "protocol",
  "मोबाइल": "mobile",
  "फ्लटर": "Flutter",
  "फ्रेमवर्क": "framework",
  "ओएनएनएक्स": "ONNX",
  "रनटाइम": "runtime",
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
  "कम्प्रेशन": "compression",
  "साइज": "size",
  "परसेंट": "percent",
  "कम्प्रेस": "compress",
  "पर्सिस्ट": "persist",
  "इम्प्रूव": "improve",
  "ऑटोमेट": "automate",
  "कम्प्लीटली": "completely",
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
};

// Character-by-character phonetic mapping
const VOWELS: Record<string, string> = {
  "अ": "a",
  "आ": "aa",
  "इ": "i",
  "ई": "ee",
  "उ": "u",
  "ऊ": "oo",
  "ऋ": "ri",
  "ए": "e",
  "ऐ": "ai",
  "ओ": "o",
  "औ": "au",
  "अं": "an",
  "अः": "ah",
};

const MATRAS: Record<string, string> = {
  "ा": "a",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ं": "n",
  "ँ": "n",
  "ः": "h",
  "्": "", // Halant/virama removes default vowel 'a'
  "ॉ": "o",
  "ॅ": "e",
};

const CONSONANTS: Record<string, string> = {
  "क": "k",
  "ख": "kh",
  "ग": "g",
  "घ": "gh",
  "ङ": "ng",
  "च": "ch",
  "छ": "chh",
  "ज": "j",
  "झ": "jh",
  "ञ": "ny",
  "ट": "t",
  "ठ": "th",
  "ड": "d",
  "ढ": "dh",
  "ण": "n",
  "त": "t",
  "थ": "th",
  "द": "d",
  "ध": "dh",
  "न": "n",
  "प": "p",
  "फ": "ph",
  "ब": "b",
  "भ": "bh",
  "म": "m",
  "य": "y",
  "र": "r",
  "ल": "l",
  "व": "v",
  "श": "sh",
  "ष": "sh",
  "स": "s",
  "ह": "h",
  "क़": "q",
  "ख़": "kh",
  "ग़": "gh",
  "ज़": "z",
  "ड़": "d",
  "ढ़": "dh",
  "फ़": "f",
  "य़": "y",
  "ऱ": "r",
};

/**
 * Checks if a string contains any Devanagari character (U+0900 to U+097F).
 */
export function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Transliterates a single Devanagari word to Roman Hinglish phonetically.
 */
function transliterateDevanagariWord(word: string): string {
  // 1. Direct dictionary lookup (case-insensitive)
  const trimmed = word.trim();
  if (HINGLISH_DICTIONARY[trimmed]) {
    return HINGLISH_DICTIONARY[trimmed];
  }

  // 2. Character-level phonetic conversion
  let result = "";
  const chars = Array.from(trimmed);
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const c = chars[i];
    const next = chars[i + 1] || "";

    // A. Independent Vowel
    if (VOWELS[c]) {
      result += VOWELS[c];
      continue;
    }

    // B. Consonant
    if (CONSONANTS[c]) {
      const base = CONSONANTS[c];

      // Check following character
      if (next === "्") {
        // Virama/halant: no vowel attached
        result += base;
        i++; // skip virama
      } else if (MATRAS[next] !== undefined) {
        // Matra attached: use matra vowel
        result += base + MATRAS[next];
        i++; // skip matra
      } else if (i === len - 1) {
        // Word-final consonant: in modern Hindi, trailing short 'a' is suppressed (schwa deletion)
        result += base;
      } else {
        // Internal consonant with inherent 'a'
        result += base + "a";
      }
      continue;
    }

    // C. Standalone Matra or Modifier
    if (MATRAS[c] !== undefined) {
      result += MATRAS[c];
      continue;
    }

    // D. Non-Devanagari character (English, punctuation, numbers)
    result += c;
  }

  return result;
}

/**
 * Convert any text containing Devanagari characters into clean Roman Hinglish.
 * English words and symbols remain untouched.
 * Guaranteed post-condition: 0% Devanagari characters remain in output.
 */
export function transliterateToHinglish(text: string): string {
  if (!text) return "";
  if (!hasDevanagari(text)) return text;

  // Split into tokens preserving whitespace and punctuation
  const tokens = text.split(/([ \t\n\r,.!?;:"'()\[\]{}]+)/);

  const convertedTokens = tokens.map((token) => {
    if (!token || !hasDevanagari(token)) {
      return token;
    }
    return transliterateDevanagariWord(token);
  });

  let result = convertedTokens.join("");

  // Post-check: ensure no stray Devanagari character escaped
  if (hasDevanagari(result)) {
    result = result.replace(/[\u0900-\u097F]/g, "");
  }

  // Minor cleanup of double vowels or awkward transliteration artifacts
  result = result
    .replace(/aa+/g, "aa")
    .replace(/ee+/g, "ee")
    .replace(/oo+/g, "oo")
    .replace(/haii+/g, "hai")
    .replace(/honn+/g, "hoon");

  return result;
}
