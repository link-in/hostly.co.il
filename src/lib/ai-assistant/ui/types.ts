import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import type { AssistantTools } from '../tools'

export type AssistantUIMessage = UIMessage<never, UIDataTypes, InferUITools<AssistantTools>>

export type AssistantUIPart = AssistantUIMessage['parts'][number]
