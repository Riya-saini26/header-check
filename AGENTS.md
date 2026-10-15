<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Heading detection lives in src/lib/heading-engine.ts as pure functions with no UI imports, so it stays testable (see src/test/heading-engine.test.ts).
- URL fetching runs only in the server function in src/lib/fetch-page.functions.ts with SSRF checks; parsing always happens in the browser via DOMParser so pasted HTML is never rendered.
- Analysis history is stored in browser localStorage (src/lib/history.ts); there is no backend database.
