import { memo } from "react";
import { FileIcon, EyeIcon } from "lucide-react";

import { MessageResponse } from "@/src/components/ai-elements/message";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
} from "@/src/components/ai-elements/code-block";
import { Button } from "@/src/components/ui/button";

type Segment =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language?: string };

export interface AITextRendererProps {
  text: string;
  onPreview?: (html: string) => void;
  messageId: string;
  partIndex: number;
}

const CODE_BLOCK_PATTERN = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;

const looksLikeHtml = (language: string | undefined, code: string): boolean => {
  if ((language ?? "").toLowerCase() === "html") {
    return true;
  }

  const trimmed = code.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<body") ||
    trimmed.includes("<table")
  );
};

const toSegments = (text: string): Segment[] => {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "code",
      language: match[1],
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: text }];
};

export const AITextRenderer = memo(({ text, onPreview, messageId, partIndex }: AITextRendererProps) => {
  const segments = toSegments(text);

  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <MessageResponse className="text-[15px] leading-7 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-[#30343b] [&_pre]:px-4 [&_pre]:py-3 [&_pre]:text-gray-200 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_code]:rounded-md [&_code]:bg-slate-400/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-gray-200">
        {text}
      </MessageResponse>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <MessageResponse
              key={`${messageId}-${partIndex}-text-${index}`}
              className="text-[15px] leading-7 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-[#30343b] [&_pre]:px-4 [&_pre]:py-3 [&_pre]:text-gray-200 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_code]:rounded-md [&_code]:bg-slate-400/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-gray-200"
            >
              {segment.content}
            </MessageResponse>
          );
        }

        const language = (segment.language || "text").toLowerCase();
        const isHtml = looksLikeHtml(language, segment.content);
        const codeLanguage = isHtml ? "html" : (language as any);

        return (
          <div key={`${messageId}-${partIndex}-code-${index}`} className="my-2 w-full max-w-full min-w-0 overflow-hidden">
            <CodeBlock code={segment.content} language={codeLanguage}>
              <CodeBlockHeader>
                <CodeBlockTitle>
                  <FileIcon size={14} />
                  <CodeBlockFilename>{isHtml ? "index.html" : `${language || "text"}.txt`}</CodeBlockFilename>
                </CodeBlockTitle>
                <CodeBlockActions>
                  {isHtml && onPreview && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => onPreview(segment.content)}
                      title="Open preview"
                    >
                      <EyeIcon size={14} />
                    </Button>
                  )}
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          </div>
        );
      })}
    </div>
  );
});

AITextRenderer.displayName = "AITextRenderer";
