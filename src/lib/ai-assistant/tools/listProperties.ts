import type { AssistantContext } from '../context'

export interface ListPropertiesOutput {
  ok: true
  properties: { propertyId: number; rooms: { roomId: number; name: string }[] }[]
}

/** The only source of IDs the model may use. Reads the context; makes no Beds24 call. */
export function listProperties(context: AssistantContext): ListPropertiesOutput {
  return {
    ok: true,
    properties: context.properties.map((property) => ({
      propertyId: property.propertyId,
      rooms: property.rooms.map((room) => ({ roomId: room.roomId, name: room.name })),
    })),
  }
}
