"use client";

import { useState } from "react";
import {
  Avatar, Badge, Box, Button, Card, DropdownMenu, Flex, IconButton, Text,
} from "@radix-ui/themes";
import {
  CaretSortIcon, ChatBubbleIcon, CheckCircledIcon, CrossCircledIcon,
  Pencil2Icon, QuestionMarkCircledIcon, ThickArrowDownIcon, ThickArrowUpIcon,
} from "@radix-ui/react-icons";
import type { Argument, ArgumentKind, Question } from "@/types/argument";
import { timeAgo } from "@/lib/timeAgo";
import QuestionCard from "./QuestionCard";
import PostForm from "./PostForm";

type FormType = "question" | "support" | "counter";
type Section = "questions" | "supports" | "counters" | "nested";
type SortOrder = "votes" | "newest" | "oldest" | "replies";

const PAGE_SIZE = 10;

interface ArgumentCardProps {
  argument: Argument;
  isSignedIn: boolean;
  onAddQuestion: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddSupport: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddCounter: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddReply: (questionId: string, content: string, imageUrl?: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
}

const kindBadge: Record<ArgumentKind, { label: string; color: "green" | "red" | "cyan" } | null> = {
  ROOT: null,
  SUPPORT: { label: "Support", color: "green" },
  COUNTER: { label: "Counter", color: "red" },
  REPLY: { label: "Reply", color: "cyan" },
};

const tagColors: Record<string, "red" | "blue" | "green" | "orange" | "purple" | "cyan" | "yellow" | "pink"> = {
  NEWS: "red",
  TECH: "blue",
  EDUCATION: "green",
  POLITICS: "orange",
  RELIGION: "purple",
  GAMING: "cyan",
  SPORTS: "yellow",
  ENTERTAINMENT: "pink",
};

const formPlaceholders: Record<FormType, string> = {
  question: "Ask a question...",
  support: "Write a supporting argument...",
  counter: "Write a counter-argument...",
};

const sortLabels: Record<SortOrder, string> = {
  votes: "Top voted",
  newest: "Newest",
  oldest: "Oldest",
  replies: "Most replies",
};

function sortArguments(args: Argument[], sort: SortOrder): Argument[] {
  return [...args].sort((a, b) => {
    if (sort === "votes") return b.score - a.score;
    if (sort === "replies") return b.totalReplyCount - a.totalReplyCount;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function sortQuestions(qs: Question[], sort: SortOrder): Question[] {
  return [...qs].sort((a, b) => {
    if (sort === "votes") return b.score - a.score;
    if (sort === "replies") return b.totalReplyCount - a.totalReplyCount;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export default function ArgumentCard({
  argument,
  isSignedIn,
  onAddQuestion,
  onAddSupport,
  onAddCounter,
  onAddReply,
  onVoteArgument,
  onVoteQuestion,
}: ArgumentCardProps) {
  const [expanded, setExpanded] = useState<Section | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [activeForm, setActiveForm] = useState<FormType | null>(null);

  // Lazy-loaded children (for individual section expand)
  const [loadedQuestions, setLoadedQuestions] = useState<Question[]>([]);
  const [loadedSupports, setLoadedSupports] = useState<Argument[]>([]);
  const [loadedCounters, setLoadedCounters] = useState<Argument[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState(argument.questionCount);
  const [supportsTotal, setSupportsTotal] = useState(argument.supportCount);
  const [countersTotal, setCountersTotal] = useState(argument.counterCount);
  const [loadingSection, setLoadingSection] = useState(false);

  // Full tree (for nested/expand-all — single API call)
  const [fullTree, setFullTree] = useState<Argument | null>(null);

  async function fetchSection(section: "questions" | "supports" | "counters", skip: number) {
    setLoadingSection(true);
    const res = await fetch(`/api/arguments/${argument.id}/children?section=${section}&skip=${skip}&limit=${PAGE_SIZE}`);
    const data = await res.json();
    if (section === "questions") {
      setLoadedQuestions((prev) => skip === 0 ? data.items : [...prev, ...data.items]);
      setQuestionsTotal(data.total);
    } else if (section === "supports") {
      setLoadedSupports((prev) => skip === 0 ? data.items : [...prev, ...data.items]);
      setSupportsTotal(data.total);
    } else {
      setLoadedCounters((prev) => skip === 0 ? data.items : [...prev, ...data.items]);
      setCountersTotal(data.total);
    }
    setLoadingSection(false);
  }

  async function fetchFullTree() {
    setLoadingSection(true);
    const res = await fetch(`/api/arguments/${argument.id}/tree`);
    const data = await res.json();
    setFullTree(data);
    setLoadingSection(false);
  }

  async function toggleSection(section: Section) {
    if (expanded === section) {
      setExpanded(null);
      return;
    }

    setExpanded(section);

    if (section === "nested") {
      if (!fullTree) fetchFullTree();
    } else {
      const loaded = section === "questions" ? loadedQuestions : section === "supports" ? loadedSupports : loadedCounters;
      if (loaded.length === 0) fetchSection(section, 0);
    }
  }

  function handleFormSubmit(content: string, imageUrl?: string) {
    if (activeForm === "question") {
      onAddQuestion(argument.id, content, imageUrl);
      argument.questionCount++;
      if (expanded === "questions") fetchSection("questions", 0);
      if (expanded === "nested") fetchFullTree();
    } else if (activeForm === "support") {
      onAddSupport(argument.id, content, imageUrl);
      argument.supportCount++;
      if (expanded === "supports") fetchSection("supports", 0);
      if (expanded === "nested") fetchFullTree();
    } else if (activeForm === "counter") {
      onAddCounter(argument.id, content, imageUrl);
      argument.counterCount++;
      if (expanded === "counters") fetchSection("counters", 0);
      if (expanded === "nested") fetchFullTree();
    }
    setActiveForm(null);
  }

  const badge = kindBadge[argument.kind];
  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion };

  // For nested view, use the full tree data (children already populated)
  const nestedQuestions = fullTree?.questions ?? [];
  const nestedSupports = fullTree?.supports ?? [];
  const nestedCounters = fullTree?.counters ?? [];

  return (
    <Flex direction="column" gap="3">
      <Card>
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton
                size="1"
                variant={argument.userVote === 1 ? "solid" : "ghost"}
                color="green"
                onClick={() => onVoteArgument(argument.id, 1)}
              >
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={argument.score > 0 ? "green" : argument.score < 0 ? "red" : "gray"}>
                {argument.score}
              </Text>
              <IconButton
                size="1"
                variant={argument.userVote === -1 ? "solid" : "ghost"}
                color="red"
                onClick={() => onVoteArgument(argument.id, -1)}
              >
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="3" flexGrow="1">
            <Flex gap="2" align="center" wrap="wrap">
              {badge && (
                <Badge color={badge.color} variant="soft" size="1">
                  {badge.label}
                </Badge>
              )}
              <Avatar
                size="1"
                radius="full"
                src={argument.author.image ?? undefined}
                fallback={argument.author.name?.[0] ?? "?"}
              />
              <Text size="1" color="gray">{argument.author.name}</Text>
              <Text size="1" color="gray">·</Text>
              <Text size="1" color="gray">{timeAgo(argument.createdAt)}</Text>
              {argument.tag && (
                <>
                  <Text size="1" color="gray">·</Text>
                  <Badge color={tagColors[argument.tag]} variant="outline" size="1">
                    {argument.tag.charAt(0) + argument.tag.slice(1).toLowerCase()}
                  </Badge>
                </>
              )}
            </Flex>
            <Text size="3">{argument.content}</Text>
            {argument.imageUrl && (
              <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 400 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={argument.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
              </Box>
            )}
            <Flex gap="4" align="center" wrap="wrap">
              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "questions" ? "solid" : "ghost"}
                  color="purple"
                  disabled={argument.questionCount === 0}
                  onClick={() => toggleSection("questions")}
                >
                  <QuestionMarkCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{questionsTotal}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "supports" ? "solid" : "ghost"}
                  color="green"
                  disabled={argument.supportCount === 0}
                  onClick={() => toggleSection("supports")}
                >
                  <CheckCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{supportsTotal}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "counters" ? "solid" : "ghost"}
                  color="red"
                  disabled={argument.counterCount === 0}
                  onClick={() => toggleSection("counters")}
                >
                  <CrossCircledIcon />
                </IconButton>
                <Text size="1" color="gray">{countersTotal}</Text>
              </Flex>

              <Flex gap="1" align="center">
                <IconButton
                  size="1"
                  variant={expanded === "nested" ? "solid" : "ghost"}
                  color="gray"
                  disabled={argument.totalReplyCount === 0}
                  onClick={() => toggleSection("nested")}
                >
                  <ChatBubbleIcon />
                </IconButton>
                <Text size="1" color="gray">{argument.totalReplyCount}</Text>
              </Flex>

              {expanded && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <Button variant="ghost" color="gray" size="1">
                      <CaretSortIcon />
                      {sortLabels[sortOrder]}
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item onClick={() => setSortOrder("newest")}>Newest</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("oldest")}>Oldest</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("votes")}>Top voted</DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setSortOrder("replies")}>Most replies</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}

              {isSignedIn && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton size="1" variant={activeForm ? "solid" : "ghost"} color="gray">
                      <Pencil2Icon />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item color="purple" onClick={() => setActiveForm("question")}>
                      Question
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="green" onClick={() => setActiveForm("support")}>
                      Support
                    </DropdownMenu.Item>
                    <DropdownMenu.Item color="red" onClick={() => setActiveForm("counter")}>
                      Counter
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {activeForm && (
        <Box className="thread-indent">
          <PostForm
            placeholder={formPlaceholders[activeForm]}
            submitLabel="Submit"
            onSubmit={handleFormSubmit}
            onCancel={() => setActiveForm(null)}
          />
        </Box>
      )}

      {loadingSection && <Text size="1" color="gray" ml="4">Loading...</Text>}

      {/* Individual section views — lazy loaded, paginated */}
      {expanded === "questions" && loadedQuestions.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--purple-6)" }}>
          <Flex direction="column" gap="2">
            {sortQuestions(loadedQuestions, sortOrder).map((q) => (
              <QuestionCard key={q.id} question={q} {...childProps} />
            ))}
            {loadedQuestions.length < questionsTotal && (
              <Button variant="soft" color="gray" size="1" onClick={() => fetchSection("questions", loadedQuestions.length)}>
                Show more ({questionsTotal - loadedQuestions.length} remaining)
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {expanded === "supports" && loadedSupports.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--green-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(loadedSupports, sortOrder).map((s) => (
              <ArgumentCard key={s.id} argument={s} {...childProps} />
            ))}
            {loadedSupports.length < supportsTotal && (
              <Button variant="soft" color="gray" size="1" onClick={() => fetchSection("supports", loadedSupports.length)}>
                Show more ({supportsTotal - loadedSupports.length} remaining)
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {expanded === "counters" && loadedCounters.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--red-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(loadedCounters, sortOrder).map((c) => (
              <ArgumentCard key={c.id} argument={c} {...childProps} />
            ))}
            {loadedCounters.length < countersTotal && (
              <Button variant="soft" color="gray" size="1" onClick={() => fetchSection("counters", loadedCounters.length)}>
                Show more ({countersTotal - loadedCounters.length} remaining)
              </Button>
            )}
          </Flex>
        </Box>
      )}

      {/* Nested view — full tree, single API call, everything expanded */}
      {expanded === "nested" && fullTree && (
        <Flex direction="column" gap="2">
          {nestedQuestions.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--purple-6)" }}>
              <Flex direction="column" gap="2">
                {sortQuestions(nestedQuestions, sortOrder).map((q) => (
                  <NestedQuestionCard key={q.id} question={q} sortOrder={sortOrder} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
          {nestedSupports.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--green-6)" }}>
              <Flex direction="column" gap="2">
                {sortArguments(nestedSupports, sortOrder).map((s) => (
                  <NestedArgumentCard key={s.id} argument={s} sortOrder={sortOrder} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
          {nestedCounters.length > 0 && (
            <Box className="thread-indent" style={{ borderLeft: "2px solid var(--red-6)" }}>
              <Flex direction="column" gap="2">
                {sortArguments(nestedCounters, sortOrder).map((c) => (
                  <NestedArgumentCard key={c.id} argument={c} sortOrder={sortOrder} {...childProps} />
                ))}
              </Flex>
            </Box>
          )}
        </Flex>
      )}
    </Flex>
  );
}

// ─── Nested view components (full tree already loaded) ───

interface NestedChildProps {
  isSignedIn: boolean;
  onAddQuestion: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddSupport: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddCounter: (argumentId: string, content: string, imageUrl?: string) => void;
  onAddReply: (questionId: string, content: string, imageUrl?: string) => void;
  onVoteArgument: (argumentId: string, value: number) => void;
  onVoteQuestion: (questionId: string, value: number) => void;
}

function NestedArgumentCard({
  argument,
  sortOrder,
  isSignedIn,
  onAddQuestion,
  onAddSupport,
  onAddCounter,
  onAddReply,
  onVoteArgument,
  onVoteQuestion,
}: { argument: Argument; sortOrder: SortOrder } & NestedChildProps) {
  const [activeForm, setActiveForm] = useState<FormType | null>(null);
  const badge = kindBadge[argument.kind];
  const childProps = { isSignedIn, onAddQuestion, onAddSupport, onAddCounter, onAddReply, onVoteArgument, onVoteQuestion };

  function handleFormSubmit(content: string, imageUrl?: string) {
    if (activeForm === "question") onAddQuestion(argument.id, content, imageUrl);
    else if (activeForm === "support") onAddSupport(argument.id, content, imageUrl);
    else if (activeForm === "counter") onAddCounter(argument.id, content, imageUrl);
    setActiveForm(null);
  }

  return (
    <Flex direction="column" gap="2">
      <Card>
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton size="1" variant={argument.userVote === 1 ? "solid" : "ghost"} color="green" onClick={() => onVoteArgument(argument.id, 1)}>
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={argument.score > 0 ? "green" : argument.score < 0 ? "red" : "gray"}>
                {argument.score}
              </Text>
              <IconButton size="1" variant={argument.userVote === -1 ? "solid" : "ghost"} color="red" onClick={() => onVoteArgument(argument.id, -1)}>
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="2" flexGrow="1">
            <Flex gap="2" align="center" wrap="wrap">
              {badge && <Badge color={badge.color} variant="soft" size="1">{badge.label}</Badge>}
              <Avatar size="1" radius="full" src={argument.author.image ?? undefined} fallback={argument.author.name?.[0] ?? "?"} />
              <Text size="1" color="gray">{argument.author.name}</Text>
              <Text size="1" color="gray">·</Text>
              <Text size="1" color="gray">{timeAgo(argument.createdAt)}</Text>
            </Flex>
            <Text size="3">{argument.content}</Text>
            {argument.imageUrl && (
              <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 400 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={argument.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
              </Box>
            )}
            {isSignedIn && (
              <Flex gap="4" align="center">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    <IconButton size="1" variant={activeForm ? "solid" : "ghost"} color="gray">
                      <Pencil2Icon />
                    </IconButton>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content size="1">
                    <DropdownMenu.Item color="purple" onClick={() => setActiveForm("question")}>Question</DropdownMenu.Item>
                    <DropdownMenu.Item color="green" onClick={() => setActiveForm("support")}>Support</DropdownMenu.Item>
                    <DropdownMenu.Item color="red" onClick={() => setActiveForm("counter")}>Counter</DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {activeForm && (
        <Box className="thread-indent">
          <PostForm
            placeholder={formPlaceholders[activeForm]}
            submitLabel="Submit"
            onSubmit={handleFormSubmit}
            onCancel={() => setActiveForm(null)}
          />
        </Box>
      )}

      {argument.questions.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--purple-6)" }}>
          <Flex direction="column" gap="2">
            {sortQuestions(argument.questions, sortOrder).map((q) => (
              <NestedQuestionCard key={q.id} question={q} sortOrder={sortOrder} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
      {argument.supports.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--green-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(argument.supports, sortOrder).map((s) => (
              <NestedArgumentCard key={s.id} argument={s} sortOrder={sortOrder} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
      {argument.counters.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--red-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(argument.counters, sortOrder).map((c) => (
              <NestedArgumentCard key={c.id} argument={c} sortOrder={sortOrder} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

function NestedQuestionCard({
  question,
  sortOrder,
  isSignedIn,
  onAddReply,
  onVoteQuestion,
  ...rest
}: { question: Question; sortOrder: SortOrder } & NestedChildProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const childProps = { isSignedIn, onAddReply, onVoteQuestion, ...rest };

  function handleReplySubmit(content: string, imageUrl?: string) {
    onAddReply(question.id, content, imageUrl);
    setShowReplyForm(false);
  }

  return (
    <Flex direction="column" gap="2">
      <Card variant="surface">
        <Flex gap="3">
          {isSignedIn && (
            <Flex direction="column" align="center" gap="0" style={{ minWidth: 32 }}>
              <IconButton size="1" variant={question.userVote === 1 ? "solid" : "ghost"} color="green" onClick={() => onVoteQuestion(question.id, 1)}>
                <ThickArrowUpIcon />
              </IconButton>
              <Text size="2" weight="medium" color={question.score > 0 ? "green" : question.score < 0 ? "red" : "gray"}>
                {question.score}
              </Text>
              <IconButton size="1" variant={question.userVote === -1 ? "solid" : "ghost"} color="red" onClick={() => onVoteQuestion(question.id, -1)}>
                <ThickArrowDownIcon />
              </IconButton>
            </Flex>
          )}
          <Flex direction="column" gap="2" flexGrow="1">
            <Flex gap="2" align="center" wrap="wrap">
              <Badge color="purple" variant="soft" size="1">Question</Badge>
              <Avatar size="1" radius="full" src={question.author.image ?? undefined} fallback={question.author.name?.[0] ?? "?"} />
              <Text size="1" color="gray">{question.author.name}</Text>
              <Text size="1" color="gray">·</Text>
              <Text size="1" color="gray">{timeAgo(question.createdAt)}</Text>
            </Flex>
            <Text size="2">{question.content}</Text>
            {question.imageUrl && (
              <Box style={{ borderRadius: 6, overflow: "hidden", maxWidth: 400 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={question.imageUrl} alt="" style={{ width: "100%", display: "block" }} />
              </Box>
            )}
            {isSignedIn && (
              <Flex gap="4" align="center">
                <IconButton
                  size="1"
                  variant={showReplyForm ? "solid" : "ghost"}
                  color="gray"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Pencil2Icon />
                </IconButton>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card>

      {showReplyForm && (
        <Box className="thread-indent">
          <PostForm
            placeholder="Write a reply..."
            submitLabel="Reply"
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
          />
        </Box>
      )}

      {question.replies.length > 0 && (
        <Box className="thread-indent" style={{ borderLeft: "2px solid var(--cyan-6)" }}>
          <Flex direction="column" gap="2">
            {sortArguments(question.replies, sortOrder).map((r) => (
              <NestedArgumentCard key={r.id} argument={r} sortOrder={sortOrder} {...childProps} />
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
