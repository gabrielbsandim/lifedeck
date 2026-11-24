import { describe, expect, it } from 'vitest'
import {
  makeClearAssistantHistory,
  makeGetAssistantHistory,
} from '@/use-cases/assistant-history'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'

const USER = 'user-1'

async function setup() {
  const conversations = new InMemoryConversationStore()
  await conversations.append(USER, [
    { role: 'user', content: 'Add milk' },
    {
      role: 'assistant',
      content: 'Added "Milk".',
      actions: [{ tool: 'addTask', id: 't1', title: 'Milk' }],
    },
    { role: 'assistant', content: '   ' },
  ])
  return {
    conversations,
    getHistory: makeGetAssistantHistory({ conversations }),
    clearHistory: makeClearAssistantHistory({ conversations }),
  }
}

describe('assistant history', () => {
  it('returns the text of each turn in order and drops blank ones', async () => {
    const ctx = await setup()

    expect(await ctx.getHistory(USER)).toEqual([
      { role: 'user', text: 'Add milk' },
      { role: 'assistant', text: 'Added "Milk".' },
    ])
  })

  it('returns an empty thread for a user with no history', async () => {
    const ctx = await setup()

    expect(await ctx.getHistory('someone-else')).toEqual([])
  })

  it('clears the thread so the next load starts empty', async () => {
    const ctx = await setup()

    await ctx.clearHistory(USER)

    expect(await ctx.conversations.load(USER)).toEqual([])
  })
})
