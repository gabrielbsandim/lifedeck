import type { ConversationTurn } from '@lifedeck/application'
import { TODAY, YESTERDAY, type World } from '@evals/assistant/world'

export type Check = { name: string; pass: boolean }

export type TurnOutcome = { text: string; toolCalls: string[] }

export type Scenario = {
  id: string
  // Seeds the world and returns any earlier conversation the turn builds on.
  seed?: (world: World) => Promise<ConversationTurn[] | void>
  message: string
  checks: (world: World, outcome: TurnOutcome) => Promise<Check[]>
}

const READ_TOOLS = new Set([
  'getToday',
  'getLists',
  'getAgenda',
  'getHabits',
  'getWeather',
])

export const fold = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const check = (name: string, pass: boolean): Check => ({ name, pass })

async function addHabit(world: World, title: string) {
  const { id } = await world.tools.addHabit(world.userId, {
    title,
    cadence: { kind: 'daily' },
  })
  return id
}

async function addTask(world: World, title: string, completed = false) {
  const { id } = await world.tools.addTask(world.userId, { title, completed })
  return id
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'habit-logged-not-task',
    seed: async world => {
      await addHabit(world, 'Treinar')
    },
    message: 'treinei hoje',
    checks: async world => {
      const [habit] = await world.habits()
      return [
        check('habit done today', habit?.doneToday === true),
        check('no task created', (await world.today()).length === 0),
      ]
    },
  },
  {
    id: 'habit-yesterday',
    seed: async world => {
      await addHabit(world, 'Ler')
    },
    message: 'ontem li 20 páginas do meu livro',
    checks: async world => {
      const [habit] = await world.habits()
      return [
        check(
          'logged on yesterday',
          await world.habitDoneOn(habit!.id, YESTERDAY),
        ),
        check('not logged today', habit?.doneToday === false),
        check('no task created', (await world.today()).length === 0),
      ]
    },
  },
  {
    id: 'complete-existing-task',
    seed: async world => {
      await addTask(world, 'Passear com a Rhaenyra')
    },
    message: 'passeamos com a Rhaenyra agora há pouco',
    checks: async world => {
      const tasks = await world.today()
      return [
        check('still one task', tasks.length === 1),
        check('task completed', tasks[0]?.status === 'completed'),
        check('no habit created', (await world.habits()).length === 0),
      ]
    },
  },
  {
    id: 'two-activities-one-message',
    seed: async world => {
      await addTask(world, 'Ir ao mercado')
      await addTask(world, 'Pagar conta de luz')
    },
    message: 'fui ao mercado e já paguei a conta de luz',
    checks: async world => {
      const tasks = await world.today()
      return [
        check('still two tasks', tasks.length === 2),
        check(
          'both completed',
          tasks.every(task => task.status === 'completed'),
        ),
      ]
    },
  },
  {
    id: 'correction-habit-to-task',
    seed: async world => {
      const habitId = await addHabit(world, 'Caminhar')
      await addTask(world, 'Passear com a Rhaenyra')
      await world.tools.logHabit(world.userId, habitId)
      return [
        { role: 'user', content: 'passeamos com a Rhaenyra' },
        {
          role: 'assistant',
          content: 'Registrei sua caminhada de hoje! 🔥',
          actions: [
            {
              tool: 'logActivity',
              id: habitId,
              title: 'Caminhar',
              kind: 'habit',
              date: TODAY,
            },
          ],
        },
      ]
    },
    message: 'não, era a tarefa do passeio com a Rhaenyra',
    checks: async world => {
      const [habit] = await world.habits()
      const tasks = await world.today()
      return [
        check('habit log undone', habit?.doneToday === false),
        check('still one task', tasks.length === 1),
        check('task completed', tasks[0]?.status === 'completed'),
      ]
    },
  },
  {
    id: 'done-without-match',
    message: 'fui à farmácia hoje de manhã',
    checks: async world => {
      const tasks = await world.today()
      return [
        check('one task', tasks.length === 1),
        check('created completed', tasks[0]?.status === 'completed'),
        check('no habit created', (await world.habits()).length === 0),
      ]
    },
  },
  {
    id: 'one-off-not-a-habit',
    message: 'treinei',
    checks: async world => {
      const tasks = await world.today()
      return [
        check('no habit created', (await world.habits()).length === 0),
        check(
          'recorded as done',
          tasks.length === 1 && tasks[0]?.status === 'completed',
        ),
      ]
    },
  },
  {
    id: 'add-several-tasks',
    message:
      'coloca na lista de hoje: comprar pão, lavar o carro e ligar pro dentista',
    checks: async world => {
      const titles = (await world.today()).map(task => fold(task.title))
      return [
        check('three tasks', titles.length === 3),
        check(
          'pão',
          titles.some(title => title.includes('pao')),
        ),
        check(
          'carro',
          titles.some(title => title.includes('carro')),
        ),
        check(
          'dentista',
          titles.some(title => title.includes('dentista')),
        ),
      ]
    },
  },
  {
    id: 'pending-task-not-completed',
    message: 'preciso lembrar de comprar ração pro cachorro',
    checks: async world => {
      const tasks = await world.today()
      return [
        check('one task', tasks.length === 1),
        check('pending', tasks[0]?.status === 'pending'),
        check('mentions ração', fold(tasks[0]?.title ?? '').includes('racao')),
      ]
    },
  },
  {
    id: 'event-local-time',
    message: 'marca dentista amanhã às 15h',
    checks: async world => {
      const events = await world.events()
      const event = events[0]
      return [
        check('one event', events.length === 1),
        check('title', fold(event?.title ?? '').includes('dentista')),
        check(
          'starts 15:00 local',
          event?.startsAt.toISOString() === '2026-11-27T18:00:00.000Z',
        ),
      ]
    },
  },
  {
    id: 'read-only-question',
    seed: async world => {
      await addTask(world, 'Academia', true)
      await addTask(world, 'Enviar relatório')
    },
    message: 'o que ainda falta fazer hoje?',
    checks: async (world, outcome) => [
      check(
        'no mutation',
        outcome.toolCalls.every(name => READ_TOOLS.has(name)),
      ),
      check('names the pending task', fold(outcome.text).includes('relatorio')),
      check(
        'board unchanged',
        (await world.today()).filter(task => task.status === 'completed')
          .length === 1,
      ),
    ],
  },
  {
    id: 'ambiguous-asks-first',
    seed: async world => {
      await addTask(world, 'Ligar para a mãe')
      await addTask(world, 'Ligar para o banco')
    },
    message: 'risca o ligar',
    checks: async world => [
      check(
        'nothing completed',
        (await world.today()).every(task => task.status === 'pending'),
      ),
    ],
  },
  {
    id: 'memory-lasting-fact',
    message: 'eu moro em Curitiba e trabalho no centro',
    checks: async world => [
      check('home saved', fold(await world.memory()).includes('curitiba')),
      check('no task created', (await world.today()).length === 0),
    ],
  },
]
