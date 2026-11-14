"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.pptx,.ppt,.docx,.doc,.zip",
  maxSizeMB = 100,
  label = "Upload Project Presentation or Source Code",
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds limit of ${maxSizeMB} MB`);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : selectedFile
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <p className="font-medium text-slate-100">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-3 rounded-full bg-slate-800 text-blue-400">
              <UploadCloud className="size-8" />
            </div>
            <div>
              <p className="font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-400 mt-1">
                Drag and drop files here, or click to browse (up to {maxSizeMB} MB)
              </p>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Accepted: PDF, PPTX, DOCX, ZIP source code
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-2 text-xs text-rose-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
