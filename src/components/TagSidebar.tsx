"use client";

import { Badge, Button, Flex, Text } from "@radix-ui/themes";
import { ALL_TAGS, type Tag } from "@/types/argument";

interface TagSidebarProps {
  selectedTag: Tag | null;
  onSelectTag: (tag: Tag | null) => void;
  tagCounts: Record<string, number>;
}

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

export default function TagSidebar({ selectedTag, onSelectTag, tagCounts }: TagSidebarProps) {
  return (
    <Flex direction="column" gap="2" style={{ minWidth: 200 }}>
      <Text size="3" weight="medium" color="gray" mb="1">Topics</Text>
      <Button
        variant={selectedTag === null ? "solid" : "ghost"}
        color="gray"
        size="2"
        style={{ justifyContent: "flex-start" }}
        onClick={() => onSelectTag(null)}
      >
        All topics
      </Button>
      {[...ALL_TAGS].sort().map((tag) => (
        <Button
          key={tag}
          variant={selectedTag === tag ? "solid" : "ghost"}
          color={tagColors[tag]}
          size="2"
          style={{ justifyContent: "flex-start" }}
          onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
        >
          <Flex justify="between" align="center" width="100%">
            <Text size="2">{tag.charAt(0) + tag.slice(1).toLowerCase()}</Text>
            {tagCounts[tag] > 0 && (
              <Badge variant="soft" color={tagColors[tag]} size="1">
                {tagCounts[tag]}
              </Badge>
            )}
          </Flex>
        </Button>
      ))}
    </Flex>
  );
}
