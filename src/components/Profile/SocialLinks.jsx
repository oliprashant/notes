import { Github, Globe, Linkedin, Twitter } from 'lucide-react'

const SOCIAL_FIELDS = [
  { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/yourname' },
  { key: 'twitter', label: 'Twitter', icon: Twitter, placeholder: 'https://x.com/yourname' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://your-site.com' },
]

/**
 * @param {{
 * value: Record<string,string>,
 * errors: Record<string,string>,
 * onChange: (key:string, value:string) => void,
 * readOnly?: boolean
 * }} props
 */
export default function SocialLinks({ value, errors, onChange, readOnly = false }) {
  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 space-y-3">
      <h3 className="text-sm font-semibold text-ink dark:text-dark-text">Social links</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SOCIAL_FIELDS.map((field) => {
          const Icon = field.icon
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-ink-muted dark:text-dark-muted inline-flex items-center gap-1">
                <Icon size={12} />
                {field.label}
              </label>
              <input
                type="text"
                value={value[field.key] || ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                disabled={readOnly}
                className="w-full rounded-lg border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-bg px-3 py-2 text-sm text-ink dark:text-dark-text outline-none focus:border-sage disabled:opacity-70"
              />
              {errors[field.key] && <p className="text-xs text-red-600">{errors[field.key]}</p>}
            </div>
          )
        })}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted">Preview</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOCIAL_FIELDS.map((field) => {
            const href = value[field.key]
            if (!href) return null
            const Icon = field.icon
            return (
              <a
                key={field.key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-parchment-200 dark:border-dark-border px-2 py-1 text-xs text-ink dark:text-dark-text hover:bg-parchment-100 dark:hover:bg-dark-hover"
              >
                <Icon size={12} />
                {field.label}
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
