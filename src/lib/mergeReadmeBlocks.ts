/**
 * Merge multiple code blocks that are all meant to be one file (e.g. README.md split into
 * intro, install, bash) into a single code block so the user gets one "Save to project" button.
 * Used when displaying chat history (GET) and when building conversation history for the model (POST)
 * so GRIP doesn't re-attempt another wrong formatted version on refresh.
 * Only merges when the first block is README and there are 2+ readme-ish blocks (markdown/plaintext/bash).
 */
export function mergeReadmeBlocks(content: string): string {
  if (!content || !content.includes('```')) return content
  const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g
  const blocks: Array<{ lang: string; code: string; start: number; end: number; preceding: string }> = []
  let match
  let prevEnd = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const preceding = content.slice(prevEnd, match.index)
    blocks.push({
      lang: (match[1] || '').trim().toLowerCase(),
      code: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
      preceding: preceding.trim()
    })
    prevEnd = match.index + match[0].length
  }
  if (blocks.length < 2) return content

  const isReadmePath = (text: string) =>
    /`README\.md`|README\.md|\*\*README\.md\*\*/i.test(text) || /\bREADME\.md\s*:?\s*$/m.test(text)
  const isReadmeLikeLang = (lang: string) => ['markdown', 'md', 'plaintext', 'text', 'bash', ''].includes(lang)
  const isOtherFile = (text: string) =>
    /`(?:package\.json|src\/|\.env|[\w-]+\.(?:tsx?|jsx?|css|html|py))`/i.test(text) ||
    /\b(?:package\.json|\.env|[\w-]+\.(?:tsx?|jsx?|css|html|py))\s*:?\s*$/m.test(text)

  const firstIsReadme = isReadmePath(blocks[0].preceding) || (blocks[0].lang === 'markdown' && blocks.length > 1)
  if (!firstIsReadme) return content

  let k = 0
  for (let i = 0; i < blocks.length; i++) {
    if (i > 0 && isOtherFile(blocks[i].preceding)) break
    if (!isReadmeLikeLang(blocks[i].lang)) break
    k = i
  }
  if (k === 0) return content

  const mergedCode = blocks
    .slice(0, k + 1)
    .map((b) => b.code)
    .join('\n\n')
  const newBlock = '`README.md`\n\n```markdown\n' + mergedCode + '\n```'
  return content.slice(0, blocks[0].start) + newBlock + content.slice(blocks[k].end)
}
