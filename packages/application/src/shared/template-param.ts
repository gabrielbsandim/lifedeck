// WhatsApp rejects a template whose body parameter contains a newline, a tab, or
// more than four consecutive spaces ("param contains new-line/tab or 4+ spaces"),
// and caps each parameter at 1024 characters. Our proactive texts are composed as
// multi-line WhatsApp messages, which is fine for a free-form send inside the 24h
// window but silently unsendable as a template once that window closes. Flattening
// here, in the single funnel every proactive template goes through, means a caller
// can keep composing readable multi-line copy without knowing the rule.

const MAX_PARAM_LENGTH = 1024

export function toTemplateParam(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_PARAM_LENGTH
    ? `${flat.slice(0, MAX_PARAM_LENGTH - 1).trimEnd()}…`
    : flat
}

export function toTemplateParams(values: string[]): string[] {
  return values.map(toTemplateParam)
}
