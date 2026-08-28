const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]!)

function closing(text: string, marker: string, start: number): number {
  for (let index = start + marker.length; index < text.length;) {
    if (text[index] === '\\') { index += 2; continue }
    if (marker !== '`' && text[index] === '`') {
      const codeEnd = closing(text, '`', index)
      if (codeEnd < 0) return -1
      index = codeEnd + 1
      continue
    }
    if (text.startsWith(marker, index) && (marker !== '*' || text[index - 1] !== '*' && text[index + 1] !== '*')) return index
    index++
  }
  return -1
}

function inline(text: string): string {
  let html = ''
  let plain = ''
  const flush = () => {
    if (!plain) return
    html += escapeHtml(plain)
    plain = ''
  }

  for (let index = 0; index < text.length;) {
    if (text[index] === '\\' && index + 1 < text.length) {
      plain += text[index + 1]
      index += 2
      continue
    }

    if (text[index] === '`') {
      const end = closing(text, '`', index)
      if (end > index + 1) {
        flush()
        html += `<code>${escapeHtml(text.slice(index + 1, end))}</code>`
        index = end + 1
        continue
      }
    }

    if (text[index] === '[') {
      const labelEnd = text.indexOf('](', index + 1)
      const urlEnd = labelEnd >= 0 ? text.indexOf(')', labelEnd + 2) : -1
      if (labelEnd > index + 1 && urlEnd > labelEnd + 2) {
        const href = text.slice(labelEnd + 2, urlEnd)
        if (/^https?:\/\/[^\s]+$/i.test(href)) {
          flush()
          html += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inline(text.slice(index + 1, labelEnd))}</a>`
          index = urlEnd + 1
          continue
        }
      }
    }

    const marker = text.startsWith('**', index) ? '**' : text.startsWith('~~', index) ? '~~' : text[index] === '*' ? '*' : ''
    if (marker) {
      const end = closing(text, marker, index)
      if (end > index + marker.length) {
        flush()
        const body = inline(text.slice(index + marker.length, end))
        html += marker === '**' ? `<strong>${body}</strong>` : marker === '~~' ? `<del>${body}</del>` : `<em>${body}</em>`
        index = end + marker.length
        continue
      }
    }

    plain += text[index++]
  }

  flush()
  return html
}

export function renderMarkdown(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: string[] = []
  let index = 0
  const wrap = (start: number, end: number, html: string) => `<div data-source-start="${start}" data-source-end="${end}">${html}</div>`

  while (index < lines.length) {
    const start = index
    const line = lines[index]!

    if (line.startsWith('```')) {
      const language = line.slice(3).trim()
      const code: string[] = []
      index++
      while (index < lines.length && !lines[index]!.startsWith('```')) code.push(lines[index++]!)
      if (index < lines.length) index++
      out.push(wrap(start, index, `<pre${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${escapeHtml(code.join('\n'))}</code></pre>`))
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      index++
      const level = heading[1]!.length
      out.push(wrap(start, index, `<h${level}>${inline(heading[2]!)}</h${level}>`))
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index]!)) quote.push(lines[index++]!.replace(/^>\s?/, ''))
      out.push(wrap(start, index, `<blockquote>${quote.map(inline).join('<br>')}</blockquote>`))
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^[-*+]\s+/.test(lines[index]!)) items.push(`<li>${inline(lines[index++]!.replace(/^[-*+]\s+/, ''))}</li>`)
      out.push(wrap(start, index, `<ul>${items.join('')}</ul>`))
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]!)) items.push(`<li>${inline(lines[index++]!.replace(/^\d+\.\s+/, ''))}</li>`)
      out.push(wrap(start, index, `<ol>${items.join('')}</ol>`))
      continue
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      index++
      out.push(wrap(start, index, '<hr>'))
      continue
    }

    if (!line.trim()) {
      index++
      continue
    }

    const paragraph = [line]
    index++
    while (index < lines.length && lines[index]!.trim() && !/^(#{1,6}\s|```|>\s?|[-*+]\s+|\d+\.\s+)/.test(lines[index]!)) paragraph.push(lines[index++]!)
    out.push(wrap(start, index, `<p>${paragraph.map(inline).join('<br>')}</p>`))
  }

  return out.join('') || '<p></p>'
}
