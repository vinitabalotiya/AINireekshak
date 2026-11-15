"use client";

import React, { useState } from "react";
import { Edit3, Check, Globe2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export interface CaptionItem {
  id?: number | string;
  speaker: "participant" | "ai_judge";
  content: string;
  language?: string;
  romanized_content?: string;
  confidence?: number;
  is_correction?: boolean;
  timestamp?: string;
}

interface CaptionPanelProps {
  captions: CaptionItem[];
  onCorrectCaption?: (original: string, corrected: string, transcriptId?: number | string) => void;
  onRepeatStatement?: () => void;
}

export function CaptionPanel({
  captions,
  onCorrectCaption,
  onRepeatStatement,
}: CaptionPanelProps) {
  const [editingCaption, setEditingCaption] = useState<CaptionItem | null>(null);
  const [correctedText, setCorrectedText] = useState("");

  const handleOpenCorrection = (item: CaptionItem) => {
    setEditingCaption(item);
    setCorrectedText(item.content);
  };

  const handleSaveCorrection = () => {
    if (editingCaption && onCorrectCaption) {
      onCorrectCaption(editingCaption.content, correctedText, editingCaption.id);
    }
    setEditingCaption(null);
  };

  const getLanguageLabel = (lang?: string) => {
    switch (lang?.toLowerCase()) {
      case "hi":
        return { label: "Hindi", color: "bg-white/5 text-zinc-300 border-white/10" };
      case "hinglish":
        return { label: "Hinglish", color: "bg-red-600/10 text-red-400 border-red-600/30" };
      default:
        return { label: "English", color: "bg-white/5 text-zinc-400 border-white/10" };
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-white/10 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black">
        <div className="flex items-center gap-2">
          <Globe2 className="size-3.5 text-red-500" />
          <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-zinc-200">
            Multilingual Captions
          </h3>
        </div>
        {onRepeatStatement && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRepeatStatement}
            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded"
          >
            <RotateCcw className="size-3 mr-1" />
            Repeat Last
          </Button>
        )}
      </div>

      {/* Caption Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 scroll-smooth">
        {captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600 text-xs font-mono">
            <p>Awaiting speech input...</p>
            <p className="mt-1 text-[11px] text-zinc-700">
              Speak in English, Hindi, or Hinglish. Captions will transcribe in real-time.
            </p>
          </div>
        ) : (
          captions.map((item, idx) => {
            const isJudge = item.speaker === "ai_judge";
            const langBadge = getLanguageLabel(item.language);

            return (
              <div
                key={idx}
                className={`p-3 rounded border text-sm transition-all ${
                  isJudge
                    ? "bg-red-600/5 border-red-600/25 text-red-300"
                    : "bg-black border-white/8 text-zinc-200"
                }`}
              >
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-semibold uppercase ${
                        isJudge ? "text-red-500" : "text-white"
                      }`}
                    >
                      {isJudge ? "AI Judge" : "Participant"}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase tracking-wider ${langBadge.color}`}
                    >
                      {langBadge.label}
                    </span>
                    {item.is_correction && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20 uppercase">
                        Corrected
                      </span>
                    )}
                  </div>

                  {!isJudge && onCorrectCaption && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenCorrection(item)}
                      className="h-6 px-1.5 text-[10px] font-mono text-zinc-400 hover:text-white hover:bg-white/5 rounded"
                    >
                      <Edit3 className="size-2.5 mr-1" />
                      Correct
                    </Button>
                  )}
                </div>

                <p className="leading-relaxed font-sans">{item.content}</p>

                {item.romanized_content && item.language?.toLowerCase() === "hi" && (
                  <p className="mt-1 text-xs text-zinc-500 font-mono italic">
                    {item.romanized_content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Correction Dialog */}
      <Dialog open={!!editingCaption} onOpenChange={(open) => !open && setEditingCaption(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white rounded">
          <DialogHeader>
            <DialogTitle className="text-white font-mono text-sm uppercase">Correct Spoken Caption</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Fix any speech recognition inaccuracies. The AI Judge will re-evaluate against this corrected version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Original Transcript:</span>
              <p className="text-xs p-2 rounded bg-black border border-white/8 text-zinc-400 italic">
                {editingCaption?.content}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300">Corrected Text:</span>
              <Textarea
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                rows={3}
                className="bg-black border-white/10 text-white text-xs focus:border-red-600 rounded"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCaption(null)}
              className="border-white/15 text-zinc-400 hover:text-white rounded text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveCorrection}
              className="bg-red-600 hover:bg-red-700 text-white rounded text-xs"
            >
              <Check className="size-3 mr-1" />
              Save Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
