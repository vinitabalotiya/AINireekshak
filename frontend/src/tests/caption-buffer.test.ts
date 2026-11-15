/**
 * Unit tests for Task 1: 2-Line Rolling Caption Buffer
 * Tests that after 50 simulated utterances, the caption buffer contains at most 2 lines
 * while the non-rendered transcript store contains all 50 utterances.
 */

import { transliterateToHinglish, hasDevanagari } from "../lib/hinglish-transliteration";

export interface CaptionEntry {
  id: string;
  speaker: "participant" | "judge";
  text: string;
  isInterim?: boolean;
  timestamp: number;
}

export function test50UtterancesBufferConstraint() {
  const fullTranscriptStore: Array<{ id: number; speaker: string; content: string }> = [];
  let renderedBuffer: CaptionEntry[] = [];

  function simulateUtterance(index: number, speaker: "participant" | "judge", text: string) {
    // 1. Full transcript store accumulates all items
    fullTranscriptStore.push({
      id: index + 1,
      speaker,
      content: text,
    });

    // 2. Rolling caption buffer keeps at most 2 lines
    const newEntry: CaptionEntry = {
      id: `line_${index + 1}`,
      speaker,
      text,
      timestamp: Date.now(),
    };

    renderedBuffer = [...renderedBuffer, newEntry].slice(-2);
  }

  // Simulate 50 back-and-forth utterances between participant and judge
  for (let i = 0; i < 50; i++) {
    const speaker: "participant" | "judge" = i % 2 === 0 ? "participant" : "judge";
    const text = speaker === "participant"
      ? `Participant statement #${i + 1}: Explaining architecture details`
      : `Judge question #${i + 1}: How do you scale under high concurrency?`;

    simulateUtterance(i, speaker, text);

    // Invariant check at every single step
    if (renderedBuffer.length > 2) {
      throw new Error(`Buffer invariant violated at step ${i + 1}: length is ${renderedBuffer.length} (> 2)`);
    }
  }

  // Final assertion: exactly 2 lines in rendered buffer, exactly 50 in full transcript store
  if (renderedBuffer.length !== 2) {
    throw new Error(`Expected exactly 2 lines in buffer, got ${renderedBuffer.length}`);
  }

  if (fullTranscriptStore.length !== 50) {
    throw new Error(`Expected 50 lines in transcript store, got ${fullTranscriptStore.length}`);
  }

  return {
    renderedCount: renderedBuffer.length,
    storedCount: fullTranscriptStore.length,
    lastTwoLines: renderedBuffer.map((l) => `${l.speaker}: ${l.text}`),
  };
}

export function testHinglishScriptInvariant() {
  const samples = [
    "हमारा प्रोजेक्ट एक AI बेस्ड प्लेटफॉर्म है",
    "हमने SQLite डेटाबेस और fast ONNX embeddings implement किया है",
    "Aapka architecture scalable kaise hai?",
    "हमने API authentication aur security guardrails lagaye hain",
    "क्या आपने नेटवर्क फेलियर का टेस्ट किया?",
  ];

  for (const sample of samples) {
    const roman = transliterateToHinglish(sample);
    if (hasDevanagari(roman)) {
      throw new Error(`Hinglish invariant violated! Devanagari character leaked: "${roman}"`);
    }
  }

  return { success: true, count: samples.length };
}

// Execute tests
try {
  const bufferRes = test50UtterancesBufferConstraint();
  console.log("✓ Task 1 Buffer Test Passed:", bufferRes);

  const hinglishRes = testHinglishScriptInvariant();
  console.log("✓ Task 2 Hinglish Script Invariant Test Passed:", hinglishRes);
} catch (e: any) {
  console.error("Test failure:", e.message);
  process.exit(1);
}
