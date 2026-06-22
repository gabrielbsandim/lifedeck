import { describe, expect, it } from 'vitest'
import { makeGenerateList } from '@/use-cases/generate-list'
import { FakeListGenerator } from '@/testing/fake-list-generator'
import type { GenerationBrief } from '@/dtos/ai-dto'

const BRIEF: GenerationBrief = {
  category: 'wedding',
  scale: 'medium',
  description: 'Plan a small garden wedding for 50 guests.',
  locale: 'en',
}

describe('generateList', () => {
  it('returns a draft from the generated plan, mapping notes', async () => {
    const generator = new FakeListGenerator({
      listTitle: 'Wedding plan',
      tasks: [
        { title: 'Book the venue', note: 'Visit three options' },
        { title: 'Choose the cake' },
      ],
    })
    const generateList = makeGenerateList({ generator })

    const draft = await generateList(BRIEF)

    expect(draft.title).toBe('Wedding plan')
    expect(draft.tasks).toEqual([
      { title: 'Book the venue', note: 'Visit three options' },
      { title: 'Choose the cake', note: null },
    ])
  })

  it('appends section tasks after the top-level tasks', async () => {
    const generator = new FakeListGenerator({
      listTitle: 'Trip',
      tasks: [{ title: 'Buy flights' }],
      sections: [
        {
          title: 'Packing',
          tasks: [{ title: 'Pack sunscreen' }, { title: 'Pack passport' }],
        },
      ],
    })
    const generateList = makeGenerateList({ generator })

    const draft = await generateList(BRIEF)

    expect(draft.tasks.map(task => task.title)).toEqual([
      'Buy flights',
      'Pack sunscreen',
      'Pack passport',
    ])
  })

  it('forwards the validated brief to the generator with defaults applied', async () => {
    const generator = new FakeListGenerator({
      listTitle: 'X',
      tasks: [{ title: 'Y' }],
    })
    const generateList = makeGenerateList({ generator })

    await generateList({
      category: 'project',
      scale: 'small',
      description: 'A side project.',
    } as GenerationBrief)

    expect(generator.lastBrief?.locale).toBe('en')
  })

  it('clamps an oversized plan to the draft limit', async () => {
    const tasks = Array.from({ length: 80 }, (_, index) => ({
      title: `Task ${index + 1}`,
    }))
    const generator = new FakeListGenerator({ listTitle: 'Big', tasks })
    const generateList = makeGenerateList({ generator })

    const draft = await generateList(BRIEF)

    expect(draft.tasks).toHaveLength(60)
  })

  it('rejects an invalid generated plan', async () => {
    const generator = new FakeListGenerator(
      () => ({ listTitle: '', tasks: [] }) as never,
    )
    const generateList = makeGenerateList({ generator })

    await expect(generateList(BRIEF)).rejects.toThrow()
  })

  it('rejects an invalid brief before calling the generator', async () => {
    const generator = new FakeListGenerator({
      listTitle: 'X',
      tasks: [{ title: 'Y' }],
    })
    const generateList = makeGenerateList({ generator })

    await expect(generateList({ ...BRIEF, description: '' })).rejects.toThrow()
    expect(generator.lastBrief).toBeNull()
  })
})
