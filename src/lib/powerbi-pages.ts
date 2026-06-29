/** Report pages that ask the user to type an email (Phase 1 landing). */
export const LANDING_PAGE_RE = /access your results|enter.*email|welcome to|landing/i

/** Internal pages — never open for members (e.g. QA). */
export const EXCLUDED_EMBED_PAGE_RE = /\bqa\b|admin|debug|internal/i

/** Member results page. */
export const RESULTS_PAGE_RE = /view my results|my results/i

export interface PowerBiPageRef {
  name: string
  displayName?: string
}

export function resolveResultsPage(pages: PowerBiPageRef[]): string | undefined {
  if (!pages.length) return undefined

  const byLabel = (re: RegExp) =>
    pages.find((p) => re.test(p.displayName ?? '') || re.test(p.name ?? ''))

  const results = byLabel(RESULTS_PAGE_RE)
  if (results) return results.name

  const memberPage = pages.find(
    (p) =>
      !LANDING_PAGE_RE.test(p.displayName ?? '') &&
      !EXCLUDED_EMBED_PAGE_RE.test(p.displayName ?? '') &&
      !EXCLUDED_EMBED_PAGE_RE.test(p.name ?? ''),
  )
  if (memberPage) return memberPage.name

  return pages.length > 1 ? pages[1]?.name : pages[0]?.name
}
