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
        return { label: "Hindi (हिन्दी)", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
      case "hinglish":
        return { label: "Hinglish", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
      case "ta":
        return { label: "Tamil", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case "te":
        return { label: "Telugu", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      default:
        return { label: "English", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Globe2 className="size-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-200">Multilingual Live Captions</h3>
        </div>
        {onRepeatStatement && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRepeatStatement}
            className="h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <RotateCcw className="size-3 mr-1" />
            Repeat Last
          </Button>
        )}
      </div>

      {/* Caption Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scroll-smooth">
        {captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 text-xs">
            <p>Awaiting speech input...</p>
            <p className="mt-1 text-[11px] text-slate-600">
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
                className={`p-3 rounded-lg border transition-all text-sm ${
                  isJudge
                    ? "bg-blue-950/20 border-blue-800/40 text-blue-100"
                    : "bg-slate-900/40 border-slate-800 text-slate-200"
                }`}
              >
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isJudge ? "text-blue-400" : "text-emerald-400"
                      }`}
                    >
                      {isJudge ? "AI Judge" : "Participant"}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${langBadge.color}`}
                    >
                      {langBadge.label}
                    </span>
                    {item.is_correction && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Corrected
                      </span>
                    )}
                  </div>

                  {!isJudge && onCorrectCaption && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenCorrection(item)}
                      className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      <Edit3 className="size-3 mr-1" />
                      Correct
                    </Button>
                  )}
                </div>

                {/* Spoken content */}
                <p className="leading-relaxed font-sans">{item.content}</p>

                {/* Romanised display for Hindi/regional where provided */}
                {item.romanized_content && item.language === "hi" && (
                  <p className="mt-1 text-xs text-slate-400 italic">
                    {item.romanized_content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Transcription Correction Dialog */}
      <Dialog open={!!editingCaption} onOpenChange={(open) => !open && setEditingCaption(null)}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Correct Transcription</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Fix any misheard technical terms, names, or phrasing so the AI judge evaluates your exact intended statement.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400">Original Transcript:</label>
              <p className="mt-1 p-2 rounded bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono">
                {editingCaption?.content}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Corrected Phrasing:</label>
              <Textarea
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                rows={3}
                className="mt-1 bg-slate-950 border-slate-700 text-slate-100 text-sm"
                placeholder="Enter accurate transcription..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCaption(null)}
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCorrection}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Check className="size-4 mr-1.5" />
              Save Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
