## 2025-05-20 - Unsanitized Markdown Injection
**Vulnerability:** XSS via `dangerouslySetInnerHTML` rendering user-provided markdown string without sanitization.
**Learning:** Custom regex-based markdown parsers often fail to sanitize input, leaving applications vulnerable to malicious HTML/script injection. Additionally, using standard `dompurify` in Next.js causes SSR issues.
**Prevention:** Always use a robust HTML sanitization library like `DOMPurify` (or `isomorphic-dompurify` for SSR/Next.js) before passing any user-generated or parsed content to `dangerouslySetInnerHTML`.
