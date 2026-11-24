import type { TriggerId } from '../domain/types'
import { customWindowDetector } from './detectors/customWindow'
import { weekendDetector } from './detectors/weekend'
import type { OpportunityDetector } from './types'

/** Add a new trigger: implement `OpportunityDetector`, add its id to `TRIGGER_IDS`, register it here. */
const DETECTORS: Record<TriggerId, OpportunityDetector> = {
  weekend: weekendDetector,
  custom_window: customWindowDetector,
}

export function getDetector(trigger: TriggerId): OpportunityDetector {
  return DETECTORS[trigger]
}
