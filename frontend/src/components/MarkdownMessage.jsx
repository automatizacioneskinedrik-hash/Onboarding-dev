import React from 'react';
import { renderInlineContent, renderMarkdownContent } from '../utils/markdown.jsx';

const MarkdownMessage = ({ content = '' }) => {
    const blocks = renderMarkdownContent(content);

    if (!blocks.length) {
        return null;
    }

    return (
        <div className="chat-markdown">
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    if (block.level === 1) {
                        return <h1 key={`block-${index}`}>{renderInlineContent(block.content, `heading-${index}`)}</h1>;
                    }

                    if (block.level === 2) {
                        return <h2 key={`block-${index}`}>{renderInlineContent(block.content, `heading-${index}`)}</h2>;
                    }

                    return <h3 key={`block-${index}`}>{renderInlineContent(block.content, `heading-${index}`)}</h3>;
                }

                if (block.type === 'unordered-list') {
                    return (
                        <ul key={`block-${index}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={`item-${itemIndex}`}>
                                    {renderInlineContent(item, `ul-${index}-${itemIndex}`)}
                                </li>
                            ))}
                        </ul>
                    );
                }

                if (block.type === 'ordered-list') {
                    return (
                        <ol key={`block-${index}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={`item-${itemIndex}`}>
                                    {renderInlineContent(item, `ol-${index}-${itemIndex}`)}
                                </li>
                            ))}
                        </ol>
                    );
                }

                if (block.type === 'code') {
                    return (
                        <pre key={`block-${index}`} className="chat-markdown-pre">
                            <code>{block.content}</code>
                        </pre>
                    );
                }

                return <p key={`block-${index}`}>{renderInlineContent(block.content, `paragraph-${index}`)}</p>;
            })}
        </div>
    );
};

export default MarkdownMessage;
