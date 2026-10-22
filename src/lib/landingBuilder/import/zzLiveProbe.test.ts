import { it } from 'vitest'
import { findPublicPictures } from './beds24PublicPictures'
it('live', async () => { const t=Date.now(); const r = await findPublicPictures('306559','x'); console.log(r.length, 'pictures in', Date.now()-t, 'ms; last:', r.at(-1)?.url) }, 30000)
