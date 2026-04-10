"use client";

import { useRef, useState } from "react";
import { Badge, Box, Button, Flex, IconButton, Popover, Text, TextArea } from "@radix-ui/themes";
import { BookmarkIcon, Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { ALL_TAGS, type Tag } from "@/types/argument";

const tagColors: Record<Tag, "red" | "blue" | "green" | "orange" | "purple" | "cyan" | "yellow" | "pink"> = {
  NEWS: "red",
  TECH: "blue",
  EDUCATION: "green",
  POLITICS: "orange",
  RELIGION: "purple",
  GAMING: "cyan",
  SPORTS: "yellow",
  ENTERTAINMENT: "pink",
};

interface PostFormProps {
  placeholder: string;
  submitLabel: string;
  showTagPicker?: boolean;
  onSubmit: (content: string, imageUrl?: string, tag?: Tag) => void;
  onCancel: () => void;
}

export default function PostForm({ placeholder, submitLabel, showTagPicker, onSubmit, onCancel }: PostFormProps) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
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
      onSubmit(content, imageUrl, selectedTag ?? undefined);
      setDraft("");
      setSelectedTag(null);
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

          {showTagPicker && (
            <>
              <Popover.Root>
                <Popover.Trigger>
                  <IconButton size="1" variant={selectedTag ? "soft" : "ghost"} color={selectedTag ? tagColors[selectedTag] : "gray"}>
                    <BookmarkIcon />
                  </IconButton>
                </Popover.Trigger>
                <Popover.Content size="1" style={{ padding: 8 }}>
                  <Flex direction="column" gap="1">
                    <Text size="1" color="gray" weight="medium" mb="1">Pick a topic</Text>
                    {[...ALL_TAGS].sort().map((tag) => (
                      <Button
                        key={tag}
                        variant={selectedTag === tag ? "solid" : "ghost"}
                        color={tagColors[tag]}
                        size="1"
                        style={{ justifyContent: "flex-start" }}
                        onClick={() => {
                          setSelectedTag(selectedTag === tag ? null : tag);
                        }}
                      >
                        {tag.charAt(0) + tag.slice(1).toLowerCase()}
                      </Button>
                    ))}
                  </Flex>
                </Popover.Content>
              </Popover.Root>
              {selectedTag && (
                <Badge color={tagColors[selectedTag]} variant="soft" size="1">
                  {selectedTag.charAt(0) + selectedTag.slice(1).toLowerCase()}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    style={{ marginLeft: 2, width: 14, height: 14 }}
                    onClick={() => setSelectedTag(null)}
                  >
                    <Cross2Icon width="10" height="10" />
                  </IconButton>
                </Badge>
              )}
            </>
          )}
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
