'use client'

import { useState, type FormEvent } from 'react'
import { Button, Dialog, TextField } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateShareLink,
  useInviteToList,
  useRevokeShareLink,
  useShareLinks,
} from '@/lib/api/use-share'

function shareUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/share/${token}`
  }
  return `${window.location.origin}/share/${token}`
}

type ShareDialogProps = {
  listId: string
  open: boolean
  onClose: () => void
}

export function ShareDialog({ listId, open, onClose }: ShareDialogProps) {
  const { messages } = useI18n()
  const links = useShareLinks(listId, open)
  const createLink = useCreateShareLink(listId)
  const revokeLink = useRevokeShareLink(listId)
  const invite = useInviteToList(listId)
  const [role, setRole] = useState<'viewer' | 'editor'>('editor')
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const link = links.data?.[0] ?? null

  async function copyLink() {
    if (!link) {
      return
    }
    await navigator.clipboard.writeText(shareUrl(link.token))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function submitInvite(event: FormEvent) {
    event.preventDefault()
    const email = inviteEmail.trim()
    if (!email) {
      return
    }
    invite.mutate({ email, role }, { onSuccess: () => setInviteEmail('') })
  }

  return (
    <Dialog open={open} onClose={onClose} title={messages.share.title}>
      <div className="flex flex-col gap-4">
        <p className="text-ink-500 text-sm">{messages.share.description}</p>

        <div className="bg-bg flex gap-1 rounded-xl p-1">
          {(['editor', 'viewer'] as const).map(value => {
            const active = role === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={active}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'text-brand-700 bg-white shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {value === 'editor'
                  ? messages.share.roleEditor
                  : messages.share.roleViewer}
              </button>
            )
          })}
        </div>

        {link ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="border-line text-ink-600 flex h-10 flex-1 items-center truncate rounded-xl border bg-white px-3 text-xs">
                {shareUrl(link.token)}
              </div>
              <Button className="h-10 px-4" onClick={copyLink}>
                {copied ? messages.share.copied : messages.share.copy}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => revokeLink.mutate(link.id)}
              className="text-ink-400 hover:text-danger self-start text-xs font-medium"
            >
              {messages.share.revoke}
            </button>
          </div>
        ) : (
          <Button
            isLoading={createLink.isPending}
            onClick={() => createLink.mutate({ role })}
          >
            {messages.share.create}
          </Button>
        )}

        <form
          onSubmit={submitInvite}
          className="border-line flex flex-col gap-2 border-t pt-4"
        >
          <span className="text-ink-700 text-sm font-medium">
            {messages.share.inviteTitle}
          </span>
          <div className="flex gap-2">
            <div className="flex-1">
              <TextField
                type="email"
                value={inviteEmail}
                onChange={event => setInviteEmail(event.target.value)}
                placeholder={messages.share.emailPlaceholder}
                aria-label={messages.share.inviteTitle}
              />
            </div>
            <Button
              type="submit"
              isLoading={invite.isPending}
              disabled={!inviteEmail.trim()}
            >
              {messages.share.sendInvite}
            </Button>
          </div>
          {invite.isSuccess && (
            <p className="text-success text-xs">{messages.share.invited}</p>
          )}
        </form>

        <Button variant="ghost" className="self-end" onClick={onClose}>
          {messages.share.close}
        </Button>
      </div>
    </Dialog>
  )
}
