import React from 'react';

const LINK_PATTERN = /^https?:\/\//i;
const INLINE_TOKEN_REGEX = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;

const isUnorderedListItem = (line) => /^\s*[-*]\s+/.test(line);
const isOrderedListItem = (line) => /^\s*\d+\.\s+/.test(line);
const isHeading = (line) => /^(#{1,4})\s+/.test(line);
const isFence = (line) => /^\s*```/.test(line);

const renderPlainTextSegment = (text, keyPrefix) => {
    const chunks = String(text || '').split('\n');

    return chunks.flatMap((chunk, index) => {
        if (index === 0) {
            return chunk;
        }

        return [<br key={`${keyPrefix}-br-${index}`} />, chunk];
    });
};

const renderInlineMarkdown = (text, keyPrefix = 'inline') => {
    const source = String(text || '');
    const nodes = [];
    let cursor = 0;
    let match;
    let tokenIndex = 0;

    while ((match = INLINE_TOKEN_REGEX.exec(source)) !== null) {
        const [fullMatch, , linkLabel, linkUrl, boldA, boldB, code, italicA, italicB] = match;
        const matchIndex = match.index;

        if (matchIndex > cursor) {
            nodes.push(...renderPlainTextSegment(source.slice(cursor, matchIndex), `${keyPrefix}-text-${tokenIndex}`));
        }

        if (linkLabel && linkUrl && LINK_PATTERN.test(linkUrl)) {
            nodes.push(
                <a
                    key={`${keyPrefix}-link-${tokenIndex}`}
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="chat-markdown-link"
                >
                    {linkLabel}
                </a>
            );
        } else if (boldA || boldB) {
            nodes.push(
                <strong key={`${keyPrefix}-strong-${tokenIndex}`} className="chat-markdown-strong">
                    {boldA || boldB}
                </strong>
            );
        } else if (code) {
            nodes.push(
                <code key={`${keyPrefix}-code-${tokenIndex}`} className="chat-markdown-code">
                    {code}
                </code>
            );
        } else if (italicA || italicB) {
            nodes.push(
                <em key={`${keyPrefix}-em-${tokenIndex}`} className="chat-markdown-em">
                    {italicA || italicB}
                </em>
            );
        } else {
            nodes.push(fullMatch);
        }

        cursor = matchIndex + fullMatch.length;
        tokenIndex += 1;
    }

    if (cursor < source.length) {
        nodes.push(...renderPlainTextSegment(source.slice(cursor), `${keyPrefix}-tail`));
    }

    return nodes;
};

const parseMarkdownBlocks = (content) => {
    const lines = String(content || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        const trimmedLine = line.trim();

        if (!trimmedLine) {
            index += 1;
            continue;
        }

        if (isFence(line)) {
            const codeLines = [];
            index += 1;

            while (index < lines.length && !isFence(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }

            if (index < lines.length && isFence(lines[index])) {
                index += 1;
            }

            blocks.push({
                type: 'code',
                content: codeLines.join('\n'),
            });
            continue;
        }

        if (isHeading(trimmedLine)) {
            const [, hashes, headingText] = trimmedLine.match(/^(#{1,4})\s+(.+)$/) || [];
            blocks.push({
                type: 'heading',
                level: hashes.length,
                content: headingText,
            });
            index += 1;
            continue;
        }

        if (isUnorderedListItem(trimmedLine)) {
            const items = [];

            while (index < lines.length && isUnorderedListItem(lines[index].trim())) {
                items.push(lines[index].trim().replace(/^\s*[-*]\s+/, ''));
                index += 1;
            }

            blocks.push({
                type: 'unordered-list',
                items,
            });
            continue;
        }

        if (isOrderedListItem(trimmedLine)) {
            const items = [];

            while (index < lines.length && isOrderedListItem(lines[index].trim())) {
                items.push(lines[index].trim().replace(/^\s*\d+\.\s+/, ''));
                index += 1;
            }

            blocks.push({
                type: 'ordered-list',
                items,
            });
            continue;
        }

        const paragraphLines = [line];
        index += 1;

        while (index < lines.length) {
            const nextLine = lines[index];
            const trimmedNextLine = nextLine.trim();

            if (
                !trimmedNextLine ||
                isFence(nextLine) ||
                isHeading(trimmedNextLine) ||
                isUnorderedListItem(trimmedNextLine) ||
                isOrderedListItem(trimmedNextLine)
            ) {
                break;
            }

            paragraphLines.push(nextLine);
            index += 1;
        }

        blocks.push({
            type: 'paragraph',
            content: paragraphLines.join('\n'),
        });
    }

    return blocks;
};

export const renderMarkdownContent = (content) => parseMarkdownBlocks(content);
export const renderInlineContent = renderInlineMarkdown;
