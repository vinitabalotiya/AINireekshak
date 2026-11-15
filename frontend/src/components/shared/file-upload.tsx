"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.pptx,.ppt,.docx,.doc,.zip",
  maxSizeMB = 10,
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
        className={`relative flex flex-col items-center justify-center p-8 border border-dashed rounded cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-red-600 bg-red-600/5"
            : selectedFile
            ? "border-white/30 bg-white/4"
            : "border-white/10 hover:border-red-600/50 bg-black hover:bg-zinc-950"
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
          <div className="flex flex-col items-center text-center gap-2 font-mono">
            <div className="p-2.5 rounded bg-white text-black">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-xs">{selectedFile.name}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2 font-mono">
            <div className="p-2.5 rounded border border-white/10 bg-zinc-950 text-red-500">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="font-medium text-white text-xs">{label}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Drag and drop files here, or click to browse (up to {maxSizeMB} MB)
              </p>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">
              Accepted: PDF, PPTX, DOCX, ZIP source code
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-500 font-mono">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
