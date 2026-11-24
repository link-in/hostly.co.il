import * as campaigns from '../campaigns/repository'
import * as connections from '../connections/repository'
import { toCredentials } from '../connections/credentials'
import { resolveContentGenerator } from '../content/registry'
import { loadHostProfile } from '../hosts/repository'
import { createWhatsAppHostNotifier } from '../notifications/hostNotifier'
import { cacheAvailabilitySource } from '../opportunities/availabilitySource'
import { getPublisher } from '../publishing/registry'
import * as rules from '../rules/repository'
import type { PromotionsDeps } from './ports'

/** Production wiring: Supabase, availability cache, env-selected AI, registered channels, WhatsApp. */
export function createDefaultDeps(): PromotionsDeps {
  return {
    store: {
      listEnabledRules: rules.listEnabledRules,
      getConnection: connections.getConnection,
      listConnectionsByStatus: connections.listConnectionsByStatus,
      updateConnection: connections.updateConnection,
      listCampaignWindows: campaigns.listCampaignWindows,
      sumCommittedBudget: campaigns.sumCommittedBudget,
      insertCampaign: campaigns.insertCampaign,
      getCampaign: campaigns.getCampaign,
      listCampaignsByStatus: campaigns.listCampaignsByStatus,
      updateCampaign: campaigns.updateCampaign,
      transitionCampaign: campaigns.transitionCampaign,
    },
    hosts: { load: loadHostProfile },
    availability: cacheAvailabilitySource,
    content: resolveContentGenerator(),
    publishers: { get: getPublisher },
    credentials: (connection) => toCredentials(connection),
    notifier: createWhatsAppHostNotifier(),
  }
}
