import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { wrapLanguageModel, type LanguageModel } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { AiSdkAgentRunner } from '@/messaging/ai-sdk-agent-runner'
import {
  SCENARIOS,
  type Check,
  type Scenario,
} from '@evals/assistant/scenarios'
import { createWorld } from '@evals/assistant/world'

type Price = { input: number; output: number }

// USD per million tokens. Luna's price comes from third-party listings and
// still needs checking against OpenAI's own pricing page.
const MODELS: Record<string, { provider: 'google' | 'openai'; price?: Price }> =
  {
    'gemini-2.5-flash': {
      provider: 'google',
      price: { input: 0.3, output: 2.5 },
    },
    'gemini-3-pro-preview': {
      provider: 'google',
      price: { input: 2, output: 12 },
    },
    'gpt-6-luna': { provider: 'openai', price: { input: 0.1, output: 0.5 } },
    'gpt-6-sol': { provider: 'openai' },
    'gpt-6.2-sol': { provider: 'openai' },
  }

type Usage = { input: number; output: number }

type CaseResult = {
  model: string
  scenario: string
  run: number
  pass: boolean
  checks: Check[]
  text: string
  toolCalls: string[]
  unverifiedClaim: boolean
  toolErrors: string[]
  recorded: string[]
  ms: number
  usage: Usage
  error?: string
}

function baseModel(id: string): LanguageModel {
  const spec = MODELS[id]
  if (!spec) {
    throw new Error(
      `Unknown model ${id}. Known: ${Object.keys(MODELS).join(', ')}`,
    )
  }
  if (spec.provider === 'openai') {
    return createOpenAI({ apiKey: requireEnv('OPENAI_API_KEY') })(id)
  }
  return createGoogleGenerativeAI({ apiKey: requireEnv('GEMINI_API_KEY') })(id)
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

function metered(id: string, usage: Usage) {
  return wrapLanguageModel({
    model: baseModel(id) as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: {
      specificationVersion: 'v3',
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate()
        usage.input += result.usage.inputTokens.total ?? 0
        usage.output += result.usage.outputTokens.total ?? 0
        return result
      },
    },
  })
}

async function runCase(
  model: string,
  scenario: Scenario,
  run: number,
): Promise<CaseResult> {
  const usage: Usage = { input: 0, output: 0 }
  const world = await createWorld()
  const history = (await scenario.seed?.(world)) ?? []
  const llm = metered(model, usage)
  const runner = new AiSdkAgentRunner(llm, llm, world.tools)
  const started = performance.now()
  const base = {
    model,
    scenario: scenario.id,
    run,
    usage,
    toolErrors: world.toolErrors,
  }
  try {
    const reply = await runner.run({
      userId: world.userId,
      message: scenario.message,
      history,
    })
    const ms = Math.round(performance.now() - started)
    const outcome = { text: reply.text, toolCalls: reply.toolCalls ?? [] }
    const recorded = (reply.recorded ?? []).map(
      a => `${a.tool}:${a.kind ?? ''}:"${a.title}"`,
    )
    const checks = await scenario.checks(world, outcome)
    const unverifiedClaim = reply.unverifiedClaim === true
    return {
      ...base,
      ...outcome,
      recorded,
      checks,
      unverifiedClaim,
      ms,
      pass: !unverifiedClaim && checks.every(c => c.pass),
    }
  } catch (error) {
    return {
      ...base,
      pass: false,
      checks: [],
      recorded: [],
      text: '',
      toolCalls: [],
      unverifiedClaim: false,
      ms: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function pool<T>(jobs: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = new Array(jobs.length)
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++
      results[index] = await jobs[index]!()
    }
  }
  await Promise.all(Array.from({ length: size }, worker))
  return results
}

function costOf(model: string, usage: Usage): number | undefined {
  const price = MODELS[model]?.price
  if (!price) {
    return undefined
  }
  return (usage.input * price.input + usage.output * price.output) / 1e6
}

function summarize(models: string[], results: CaseResult[]) {
  return models.map(model => {
    const mine = results.filter(r => r.model === model)
    const usage = mine.reduce(
      (sum, r) => ({
        input: sum.input + r.usage.input,
        output: sum.output + r.usage.output,
      }),
      { input: 0, output: 0 },
    )
    const ms = mine.map(r => r.ms).sort((a, b) => a - b)
    const cost = costOf(model, usage)
    return {
      model,
      passed: `${mine.filter(r => r.pass).length}/${mine.length}`,
      unbackedClaims: mine.filter(r => r.unverifiedClaim).length,
      errors: mine.filter(r => r.error).length,
      p50ms: ms[Math.floor(ms.length / 2)] ?? 0,
      tokensPerTurn: Math.round(
        (usage.input + usage.output) / (mine.length || 1),
      ),
      usdPer1kTurns:
        cost === undefined ? 'n/a' : ((cost / mine.length) * 1000).toFixed(2),
    }
  })
}

function matrix(
  models: string[],
  scenarios: Scenario[],
  results: CaseResult[],
) {
  return scenarios.map(scenario => {
    const row: Record<string, string> = { scenario: scenario.id }
    for (const model of models) {
      const mine = results.filter(
        r => r.model === model && r.scenario === scenario.id,
      )
      row[model] = `${mine.filter(r => r.pass).length}/${mine.length}`
    }
    return row
  })
}

async function main() {
  const env = process.env
  const models = (env.EVAL_MODELS ?? 'gemini-2.5-flash,gpt-6-luna')
    .split(',')
    .map(m => m.trim())
  const runs = Number(env.EVAL_RUNS ?? 3)
  const only = env.EVAL_ONLY?.split(',')
  const scenarios = only
    ? SCENARIOS.filter(s => only.includes(s.id))
    : SCENARIOS
  models.forEach(baseModel)

  const jobs = models.flatMap(model =>
    scenarios.flatMap(scenario =>
      Array.from(
        { length: runs },
        (_, run) => () => runCase(model, scenario, run),
      ),
    ),
  )
  const results = await pool(jobs, Number(env.EVAL_CONCURRENCY ?? 4))

  console.table(summarize(models, results))
  console.table(matrix(models, scenarios, results))
  for (const r of results.filter(r => !r.pass)) {
    const failed = r.checks.filter(c => !c.pass).map(c => c.name)
    const why =
      r.error ?? (r.unverifiedClaim ? 'unbacked claim' : failed.join(', '))
    console.log(
      `FAIL ${r.model} ${r.scenario}#${r.run}: ${why} | tools=${r.toolCalls.join(',')} | recorded=${r.recorded.join(',')} | errors=${r.toolErrors.join('; ')} | "${r.text.replace(/\s+/g, ' ').slice(0, 160)}"`,
    )
  }
  if (env.EVAL_OUT) {
    writeFileSync(
      env.EVAL_OUT,
      JSON.stringify({ models, runs, results }, null, 2),
    )
  }
}

// Run through vitest only so the @/ and @evals/ aliases resolve like in tests.
it('assistant eval', main, 30 * 60 * 1000)
