import { agent } from './ai/agent.js';
import React, { useState } from 'react';
import { pathToFileURL } from 'node:url';
import { render, Box, Text, Static, useApp } from 'ink';
import { TextInput } from '@inkjs/ui';
import Spinner from 'ink-spinner';
import { createHighlighter } from 'shiki';

// ─── Theme ───────────────────────────────────────────────────────────────────

const theme = {
	accent: '#22C55E',
	accentSoft: '#4ADE80',
	accentDim: '#166534',
	user: '#4ADE80',
	assistant: '#34D399',
	muted: '#6B7280',
	subtle: '#9CA3AF',
	text: '#E5E7EB',
	textBright: '#F9FAFB',
	border: '#374151',
	borderSoft: '#1F2937',
	codeBg: '#1E1E1E',
	codeBorder: '#30363D',
	codeFg: '#D4D4D4',
	userBg: '#052e16',
	quote: '#A78BFA',
	heading: '#F8FAFC',
	inlineCode: '#FBBF24',
	lineNum: '#4B5563',
	badge: '#86EFAC',
};

// ─── Logo & Welcome ──────────────────────────────────────────────────────────

const logo = [
	'    _   ___ __  __',
	'   /_\\ | _ \\\\ \\/ /',
	'  / _ \\|   / >  < ',
	' /_/ \\_\\_|_\\/_/\\_\\',
].join('\n');

const Welcome = () => (
	<Box
		borderStyle="round"
		borderColor={theme.border}
		paddingX={2}
		paddingY={1}
		marginBottom={1}
		marginRight={1}
	>
		<Box marginRight={5}>
			<Text color={theme.accent}>{logo}</Text>
		</Box>
		<Box flexDirection="column" gap={0}>
			<Box>
				<Text bold color={theme.textBright}>
					Arxjudge
				</Text>
				<Text color={theme.muted}>  v1.0.0</Text>
			</Box>
			<Box height={1} />
			<Text color={theme.accentSoft} bold>
				Arxjudge is here!
			</Text>
			<Text color={theme.subtle}>
				{"Judge your AI agent's answers right from your terminal."}
			</Text>
			<Box height={1} />
			<Box>
				<Text bold color={theme.text}>
					{'  chat  '}
				</Text>
				<Text color={theme.muted}>type your message & press enter</Text>
			</Box>
			<Box>
				<Text bold color={theme.text}>
					{'  quit  '}
				</Text>
				<Text color={theme.muted}>exit · quit · bye</Text>
			</Box>
			<Box>
				<Text bold color={theme.text}>
					{'  store '}
				</Text>
				<Text color={theme.muted}>https://www.ar4x.store/</Text>
			</Box>
		</Box>
	</Box>
);

// ─── Shiki highlighter ───────────────────────────────────────────────────────

const SUPPORTED_LANGS = [
	'javascript',
	'typescript',
	'tsx',
	'jsx',
	'python',
	'cpp',
	'c',
	'java',
	'rust',
	'go',
	'bash',
	'shellscript',
	'json',
	'html',
	'css',
	'markdown',
	'yaml',
	'sql',
	'xml',
	'toml',
	'plaintext',
];

const LANG_ALIASES = {
	js: 'javascript',
	ts: 'typescript',
	py: 'python',
	'c++': 'cpp',
	cxx: 'cpp',
	cc: 'cpp',
	'c#': 'csharp',
	cs: 'csharp',
	rs: 'rust',
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	yml: 'yaml',
	md: 'markdown',
	htm: 'html',
	txt: 'plaintext',
	text: 'plaintext',
	plain: 'plaintext',
	code: 'plaintext',
};

let highlighterPromise = null;

function getHighlighter() {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['dark-plus'],
			langs: SUPPORTED_LANGS,
		});
	}
	return highlighterPromise;
}

function resolveLang(language, highlighter) {
	const raw = (language || 'plaintext').toLowerCase().trim() || 'plaintext';
	const aliased = LANG_ALIASES[raw] || raw;
	const loaded = highlighter.getLoadedLanguages();
	if (loaded.includes(aliased)) return aliased;
	if (loaded.includes(raw)) return raw;
	return 'plaintext';
}

async function highlightCode(code, language) {
	try {
		const highlighter = await getHighlighter();
		const lang = resolveLang(language, highlighter);
		const { tokens } = highlighter.codeToTokens(code, {
			lang,
			theme: 'dark-plus',
		});
		return tokens.map((line) =>
			line.map((token) => ({
				content: token.content,
				color: token.color || theme.codeFg,
			})),
		);
	} catch {
		return code.split('\n').map((line) => [{ content: line, color: theme.codeFg }]);
	}
}

// ─── Markdown parsing ────────────────────────────────────────────────────────

const FENCE_RE = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)```/g;

function parseInline(text) {
	const parts = [];
	// Order matters: bold before italic, so ** is not eaten as two italics.
	const re = /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+?`|\*[^*]+?\*|_[^_]+?_)/g;
	let last = 0;
	let match;

	while ((match = re.exec(text)) !== null) {
		if (match.index > last) {
			parts.push({ type: 'text', value: text.slice(last, match.index) });
		}

		const raw = match[0];
		if (raw.startsWith('**') || raw.startsWith('__')) {
			parts.push({ type: 'bold', value: raw.slice(2, -2) });
		} else if (raw.startsWith('`')) {
			parts.push({ type: 'code', value: raw.slice(1, -1) });
		} else {
			parts.push({ type: 'italic', value: raw.slice(1, -1) });
		}
		last = match.index + raw.length;
	}

	if (last < text.length) {
		parts.push({ type: 'text', value: text.slice(last) });
	}

	return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

function isListItem(line) {
	return /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line);
}

function isHeading(line) {
	return /^#{1,6}\s+/.test(line);
}

function isBlockquote(line) {
	return /^>\s?/.test(line);
}

function parseMarkdownBlocks(text) {
	if (!text) return [];

	const lines = text.split('\n');
	const blocks = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.trim() === '') {
			i += 1;
			continue;
		}

		const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (headingMatch) {
			blocks.push({
				type: 'heading',
				level: headingMatch[1].length,
				text: headingMatch[2],
			});
			i += 1;
			continue;
		}

		if (isBlockquote(line)) {
			const quoteLines = [];
			while (i < lines.length && isBlockquote(lines[i])) {
				quoteLines.push(lines[i].replace(/^>\s?/, ''));
				i += 1;
			}
			blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
			continue;
		}

		if (/^[-*+]\s+/.test(line)) {
			const items = [];
			while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^[-*+]\s+/, ''));
				i += 1;
			}
			blocks.push({ type: 'ul', items });
			continue;
		}

		if (/^\d+\.\s+/.test(line)) {
			const items = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\d+\.\s+/, ''));
				i += 1;
			}
			blocks.push({ type: 'ol', items });
			continue;
		}

		const para = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!isHeading(lines[i]) &&
			!isBlockquote(lines[i]) &&
			!isListItem(lines[i])
		) {
			para.push(lines[i]);
			i += 1;
		}
		blocks.push({ type: 'paragraph', text: para.join(' ') });
	}

	return blocks;
}

async function prepareSegments(content) {
	const source = content ?? '';
	FENCE_RE.lastIndex = 0;

	const segments = [];
	let lastIndex = 0;
	let match;

	while ((match = FENCE_RE.exec(source)) !== null) {
		if (match.index > lastIndex) {
			const text = source.slice(lastIndex, match.index);
			segments.push({
				type: 'markdown',
				blocks: parseMarkdownBlocks(text),
			});
		}

		const language = (match[1] || 'plaintext').toLowerCase() || 'plaintext';
		let value = match[2];
		// Keep blank lines and indentation; only drop the trailing newline before ```.
		if (value.endsWith('\n')) {
			value = value.slice(0, -1);
		}

		const tokens = await highlightCode(value, language);
		segments.push({
			type: 'code',
			language,
			value,
			tokens,
		});
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < source.length) {
		segments.push({
			type: 'markdown',
			blocks: parseMarkdownBlocks(source.slice(lastIndex)),
		});
	}

	if (segments.length === 0) {
		return [{ type: 'markdown', blocks: parseMarkdownBlocks(source) }];
	}

	return segments;
}

// ─── Inline / Markdown renderers ─────────────────────────────────────────────

const InlineText = ({ parts, color = theme.text }) => (
	<Text>
		{parts.map((part, index) => {
			if (part.type === 'bold') {
				return (
					<Text key={index} bold color={theme.textBright}>
						{part.value}
					</Text>
				);
			}
			if (part.type === 'italic') {
				return (
					<Text key={index} italic color={color}>
						{part.value}
					</Text>
				);
			}
			if (part.type === 'code') {
				return (
					<Text key={index} color={theme.inlineCode}>
						{` ${part.value} `}
					</Text>
				);
			}
			return (
				<Text key={index} color={color}>
					{part.value}
				</Text>
			);
		})}
	</Text>
);

const MarkdownBlock = ({ block }) => {
	if (block.type === 'heading') {
		const prefix = '#'.repeat(Math.min(block.level, 3));
		return (
			<Box marginY={block.level <= 2 ? 1 : 0}>
				<Text bold color={theme.heading}>
					{prefix} {block.text}
				</Text>
			</Box>
		);
	}

	if (block.type === 'blockquote') {
		return (
			<Box marginY={0}>
				<Text color={theme.quote}>{'│ '}</Text>
				<InlineText parts={parseInline(block.text)} color={theme.subtle} />
			</Box>
		);
	}

	if (block.type === 'ul') {
		return (
			<Box flexDirection="column" marginY={0}>
				{block.items.map((item, index) => (
					<Box key={index}>
						<Text color={theme.accent}>{'  • '}</Text>
						<InlineText parts={parseInline(item)} />
					</Box>
				))}
			</Box>
		);
	}

	if (block.type === 'ol') {
		return (
			<Box flexDirection="column" marginY={0}>
				{block.items.map((item, index) => {
					const num = String(index + 1).padStart(2, ' ');
					return (
						<Box key={index}>
							<Text color={theme.accent}>{` ${num}. `}</Text>
							<InlineText parts={parseInline(item)} />
						</Box>
					);
				})}
			</Box>
		);
	}

	// paragraph
	return (
		<Box>
			<InlineText parts={parseInline(block.text)} />
		</Box>
	);
};

const MarkdownBody = ({ blocks }) => {
	if (!blocks || blocks.length === 0) {
		return <Text color={theme.muted}> </Text>;
	}

	return (
		<Box flexDirection="column" gap={0}>
			{blocks.map((block, index) => (
				<MarkdownBlock key={index} block={block} />
			))}
		</Box>
	);
};

// ─── Code block (Shiki) ──────────────────────────────────────────────────────

const CodeBlock = ({ language, tokens, value }) => {
	const lines =
		tokens && tokens.length > 0
			? tokens
			: (value || '').split('\n').map((line) => [{ content: line, color: theme.codeFg }]);

	const width = String(Math.max(lines.length, 1)).length;
	const label = (language || 'plaintext').toLowerCase();

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={theme.codeBorder}
			backgroundColor={theme.codeBg}
			paddingX={1}
			paddingY={0}
			marginY={1}
		>
			<Box marginBottom={0} justifyContent="space-between">
				<Text color={theme.badge} bold>
					{` ${label} `}
				</Text>
				<Text color={theme.lineNum}>code</Text>
			</Box>
			<Box marginBottom={0}>
				<Text color={theme.borderSoft}>{'─'.repeat(Math.min(40, 12 + label.length))}</Text>
			</Box>
			{lines.map((lineTokens, index) => {
				const lineNumber = String(index + 1).padStart(width, ' ');
				const chunks =
					lineTokens && lineTokens.length > 0
						? lineTokens
						: [{ content: ' ', color: theme.codeFg }];

				return (
					<Box key={`line-${index}`} flexWrap="wrap">
						<Text color={theme.lineNum}>{`${lineNumber} │ `}</Text>
						<Text wrap="wrap">
							{chunks.map((chunk, chunkIndex) => (
								<Text key={chunkIndex} color={chunk.color || theme.codeFg}>
									{chunk.content === '' ? ' ' : chunk.content}
								</Text>
							))}
						</Text>
					</Box>
				);
			})}
		</Box>
	);
};

// ─── Message body & bubble ───────────────────────────────────────────────────

const MessageBody = ({ segments, content }) => {
	const resolved =
		segments ||
		// Fallback for anything that skipped prepareSegments (should be rare).
		[{ type: 'markdown', blocks: parseMarkdownBlocks(content ?? '') }];

	return (
		<Box flexDirection="column">
			{resolved.map((segment, index) => {
				if (segment.type === 'code') {
					return (
						<CodeBlock
							key={`code-${index}`}
							language={segment.language}
							tokens={segment.tokens}
							value={segment.value}
						/>
					);
				}

				return <MarkdownBody key={`md-${index}`} blocks={segment.blocks || []} />;
			})}
		</Box>
	);
};

const MessageBubble = ({ message, index }) => {
	const isUser = message.role === 'user';
	const labelColor = isUser ? theme.user : theme.assistant;

	return (
		<Box
			key={index}
			marginBottom={1}
			flexDirection="column"
			backgroundColor={isUser ? theme.userBg : undefined}
			borderStyle={isUser ? undefined : 'round'}
			borderColor={isUser ? undefined : theme.accentDim}
			paddingX={1}
			marginRight={1}
		>
			<Box marginBottom={0}>
				<Text color={labelColor} bold>
					{isUser ? '› you' : '› arxjudge'}
				</Text>
			</Box>
			<MessageBody segments={message.segments} content={message.content} />
		</Box>
	);
};

// ─── Loading & Input ─────────────────────────────────────────────────────────

const LoadingIndicator = () => (
	<Box marginBottom={1} marginLeft={1}>
		<Text color={theme.accent}>
			<Spinner type="dots" />
		</Text>
		<Text color={theme.subtle}> Thinking…</Text>
	</Box>
);

const Hint = () => (
	<Box marginBottom={0} marginLeft={1}>
		<Text color={theme.muted}>Tip: type </Text>
		<Text color={theme.subtle}>exit</Text>
		<Text color={theme.muted}> or </Text>
		<Text color={theme.subtle}>quit</Text>
		<Text color={theme.muted}> to end the session.</Text>
	</Box>
);

const InputBar = ({ inputKey, isLoading, onSubmit }) => (
	<Box
		borderStyle="round"
		borderColor={isLoading ? theme.border : theme.accent}
		paddingX={1}
		paddingY={0}
		marginRight={1}
		marginTop={0}
	>
		<Text color={isLoading ? theme.muted : theme.accent} bold>
			{'› '}
		</Text>
		<TextInput key={inputKey} isDisabled={isLoading} onSubmit={onSubmit} />
	</Box>
);

// ─── App ─────────────────────────────────────────────────────────────────────

export const App = () => {
	const [messages, setMessages] = useState([{ role: 'header' }]);
	const [isLoading, setIsLoading] = useState(false);
	const [inputKey, setInputKey] = useState(0);
	const { exit } = useApp();

	const handleSubmit = async (text) => {
		const trimmed = text.trim();
		if (['exit', 'quit', 'bye'].includes(trimmed.toLowerCase())) {
			exit();
			return;
		}

		// Pre-render segments so Ink Static freezes a fully highlighted frame.
		const userSegments = await prepareSegments(text);
		setMessages((prev) => [
			...prev,
			{ role: 'user', content: text, segments: userSegments },
		]);
		setInputKey((k) => k + 1);
		setIsLoading(true);

		const answer = await agent(text);
		const assistantSegments = await prepareSegments(answer);
		setMessages((prev) => [
			...prev,
			{ role: 'assistant', content: answer, segments: assistantSegments },
		]);

		setIsLoading(false);
	};

	return (
		<Box flexDirection="column" paddingX={0}>
			<Static items={messages}>
				{(message, index) =>
					message.role === 'header' ? (
						<Welcome key="header" />
					) : (
						<MessageBubble key={index} message={message} index={index} />
					)
				}
			</Static>

			{isLoading && <LoadingIndicator />}
			{!isLoading && <Hint />}

			<InputBar inputKey={inputKey} isLoading={isLoading} onSubmit={handleSubmit} />
		</Box>
	);
};

// 1. Return the instance so the caller can wait for it if needed
export function chat() {
	return render(<App />);
}

// 2. FIXED DIRECT RUN GUARD: Safely detects if this specific file was run via Node directly
const nodePath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
const currentFilePath = import.meta.url;

if (
	nodePath &&
	(nodePath === currentFilePath ||
		nodePath.endsWith('fancy.jsx') ||
		nodePath.endsWith('fancy.js'))
) {
	chat();
}
