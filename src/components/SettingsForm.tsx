"use client";

import { useRef, useState } from "react";
import { Avatar, Box, Button, Card, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { Cross2Icon, ImageIcon } from "@radix-ui/react-icons";

interface SettingsFormProps {
  initialName: string;
  initialImage: string | null;
}

export default function SettingsForm({ initialName, initialImage }: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 1 * 1024 * 1024) {
      setMessage("Image must be under 1 MB");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      let newImageUrl = imageUrl;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error);
        newImageUrl = uploadData.url;
      }

      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: newImageUrl }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setImageUrl(newImageUrl);
      clearFile();
      setMessage("Saved!");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const displayImage = preview || imageUrl;

  return (
    <Card size="3">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">Profile picture</Text>
            <Flex align="center" gap="3">
              <Avatar
                size="5"
                radius="full"
                src={displayImage ?? undefined}
                fallback={name?.[0] ?? "?"}
              />
              <Flex direction="column" gap="1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  hidden
                />
                <Button
                  type="button"
                  variant="soft"
                  size="1"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon /> Upload
                </Button>
                {file && (
                  <Flex align="center" gap="1">
                    <Text size="1" color="gray">{file.name}</Text>
                    <IconButton type="button" size="1" variant="ghost" color="gray" onClick={clearFile}>
                      <Cross2Icon />
                    </IconButton>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>

          <Box>
            <Text as="label" size="2" weight="medium" mb="1">Name</Text>
            <TextField.Root
              size="3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Box>

          {message && (
            <Text size="2" color={message === "Saved!" ? "green" : "red"}>
              {message}
            </Text>
          )}

          <Button size="3" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}
