'use client'

import { useState } from 'react'
import type { ShareLinkView } from '@taskin/application'
import { Button, Dialog, EmptyState } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateShareLink,
  useMembers,
  useRemoveMember,
  useRevokeShareLink,
  useShareLinks,
} from '@/lib/api/use-share'

function shareUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/share/${token}`
  }
  return `${window.location.origin}/share/${token}`
}

function ShareLinkRow({
  link,
  listId,
}: {
  link: ShareLinkView
  listId: string
}) {
  const { messages } = useI18n()
  const revoke = useRevokeShareLink(listId)
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(shareUrl(link.token))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <li className="border-line flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
      <span className="text-ink-700 flex-1 truncate text-xs">
        {shareUrl(link.token)}
      </span>
      <Button variant="ghost" className="h-8 px-2 text-xs" onClick={copy}>
        {copied ? messages.share.copied : messages.share.copy}
      </Button>
      <Button
        variant="ghost"
        className="text-danger h-8 px-2 text-xs"
        onClick={() => revoke.mutate(link.id)}
      >
        {messages.share.revoke}
      </Button>
    </li>
  )
}

type ShareDialogProps = {
  listId: string
  open: boolean
  onClose: () => void
}

export function ShareDialog({ listId, open, onClose }: ShareDialogProps) {
  const { messages } = useI18n()
  const links = useShareLinks(listId)
  const createLink = useCreateShareLink(listId)
  const members = useMembers(listId, open)
  const removeMember = useRemoveMember(listId)
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer')

  return (
    <Dialog open={open} onClose={onClose} title={messages.share.title}>
      <p className="text-ink-500 mb-4 text-sm">{messages.share.description}</p>

      {links.isSuccess && links.data.length === 0 && (
        <EmptyState title={messages.share.empty} className="mb-4" />
      )}

      {links.isSuccess && links.data.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {links.data.map(link => (
            <ShareLinkRow key={link.id} link={link} listId={listId} />
          ))}
        </ul>
      )}

      {members.isSuccess && members.data.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {members.data.map(member => (
            <li
              key={member.id}
              className="border-line flex items-center gap-2 rounded-xl border bg-white px-3 py-2"
            >
              <span className="text-ink-700 flex-1 text-sm">
                {member.displayName}
              </span>
              <span className="text-ink-500 text-xs capitalize">
                {member.role}
              </span>
              <Button
                variant="ghost"
                className="text-danger h-8 px-2 text-xs"
                onClick={() => removeMember.mutate(member.userId)}
              >
                {messages.share.revoke}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            isLoading={createLink.isPending}
            onClick={() => createLink.mutate({ role })}
          >
            {messages.share.create}
          </Button>
          <select
            aria-label={messages.share.role}
            value={role}
            onChange={event =>
              setRole(event.target.value as 'viewer' | 'editor')
            }
            className="border-line text-ink-600 rounded-lg border bg-white px-2 py-1 text-xs outline-none"
          >
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
          </select>
        </div>
        <Button variant="ghost" onClick={onClose}>
          {messages.share.close}
        </Button>
      </div>
    </Dialog>
  )
}
