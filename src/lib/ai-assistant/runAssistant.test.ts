import { describe, it, expect, vi } from 'vitest'
import { simulateReadableStream } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import type { AssistantContext } from './context'
import { runAssistant } from './runAssistant'

const context: AssistantContext = {
  userId: 'user-1',
  displayName: 'דלית',
  channel: 'web',
  properties: [{ propertyId: 306559, rooms: [{ roomId: 638851, name: 'נוף הרים' }] }],
}

function usage(input: number, output: number) {
  return {
    inputTokens: { total: input, noCache: input, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: output, text: output, reasoning: 0 },
  }
}

type StreamPart = Parameters<typeof simulateReadableStream>[0]['chunks'][number]

function streamOf(chunks: StreamPart[]) {
  return { stream: simulateReadableStream({ chunks, chunkDelayInMs: null, initialDelayInMs: null }) }
}

describe('runAssistant', () => {
  it('runs a tool round-trip and reports total token usage', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        streamOf([
          { type: 'stream-start', warnings: [] },
          { type: 'tool-call', toolCallId: 'call-1', toolName: 'list_properties', input: '{}' },
          { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage: usage(100, 10) },
        ]),
        streamOf([
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't1' },
          { type: 'text-delta', id: 't1', delta: 'יש לך חדר אחד: נוף הרים.' },
          { type: 'text-end', id: 't1' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: usage(150, 20) },
        ]),
      ] as never,
    })
    const onUsage = vi.fn()

    const result = runAssistant({
      context,
      messages: [{ role: 'user', content: 'אילו חדרים יש לי?' }],
      model,
      now: new Date('2026-10-22T09:00:00Z'),
      onUsage,
    })

    expect(await result.text).toBe('יש לך חדר אחד: נוף הרים.')

    const steps = await result.steps
    expect(steps[0].toolResults[0]).toMatchObject({
      toolName: 'list_properties',
      output: { ok: true, properties: [{ propertyId: 306559 }] },
    })

    const systemMessage = model.doStreamCalls[0].prompt[0]
    expect(systemMessage.role).toBe('system')
    expect(JSON.stringify(systemMessage)).toContain('Today is 2026-10-22')
    expect(model.doStreamCalls[0].tools?.map((t) => t.name)).toEqual([
      'list_properties',
      'check_availability',
      'block_dates',
      'update_price',
    ])

    await result.consumeStream()
    await vi.waitFor(() => expect(onUsage).toHaveBeenCalled())
    expect(onUsage.mock.calls[0][0]).toMatchObject({ inputTokens: 250, outputTokens: 30 })
  })
})
