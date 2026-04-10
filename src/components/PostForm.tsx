"use client";

import { useRef, useState } from "react";
import { Box, Button, Flex, IconButton, Text, TextArea } from "@radix-ui/themes";
import { Cross2Icon, ImageIcon } from "@radix-ui/react-icons";

interface PostFormProps {
  placeholder: string;
  submitLabel: string;
  onSubmit: (content: string, imageUrl?: string) => void;
  onCancel: () => void;
}

export default function PostForm({ placeholder, submitLabel, onSubmit, onCancel }: PostFormProps) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 1 * 1024 * 1024) {
      alert("Image must be under 1 MB");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    const content = draft.trim();
    if (!content) return;

    setUploading(true);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        imageUrl = data.url;
      }
      onSubmit(content, imageUrl);
      setDraft("");
      clearFile();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Flex direction="column" gap="2">
      <TextArea
        size="2"
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) handleSubmit();
        }}
      />
      {preview && (
        <Flex align="start" gap="2">
          <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" style={{ width: "100%", display: "block" }} />
          </Box>
          <IconButton size="1" variant="ghost" color="gray" onClick={clearFile}>
            <Cross2Icon />
          </IconButton>
        </Flex>
      )}
      <Flex justify="between" align="center">
        <Flex gap="2" align="center">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            hidden
          />
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon />
          </IconButton>
          {file && <Text size="1" color="gray">{file.name}</Text>}
        </Flex>
        <Flex gap="2">
          <Button variant="soft" color="gray" size="1" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button size="1" onClick={handleSubmit} disabled={!draft.trim() || uploading}>
            {uploading ? "Uploading..." : submitLabel}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
