// lib/instagram.ts
const BASE = 'https://graph.instagram.com/v21.0'

export interface IGConfig { accessToken: string; userId: string }

async function createContainer(cfg: IGConfig, imageUrl: string, isChild = true): Promise<string> {
  const p = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: isChild ? 'true' : 'false',
    access_token: cfg.accessToken,
  })
  const r = await fetch(`${BASE}/${cfg.userId}/media`, { method: 'POST', body: p })
  const d = await r.json()
  if (d.error) throw new Error(`IG: ${d.error.message}`)
  return d.id
}

async function waitReady(cfg: IGConfig, id: string, ms = 90000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    const r = await fetch(`${BASE}/${id}?fields=status_code&access_token=${cfg.accessToken}`)
    const d = await r.json()
    if (d.status_code === 'FINISHED') return
    if (d.status_code === 'ERROR') throw new Error('IG media processing failed')
    await new Promise(r => setTimeout(r, 4000))
  }
  throw new Error('IG container timeout')
}

async function publishContainer(cfg: IGConfig, containerId: string): Promise<string> {
  const p = new URLSearchParams({ creation_id: containerId, access_token: cfg.accessToken })
  const r = await fetch(`${BASE}/${cfg.userId}/media_publish`, { method: 'POST', body: p })
  const d = await r.json()
  if (d.error) throw new Error(`IG publish: ${d.error.message}`)
  return d.id
}

export async function publishCarousel(cfg: IGConfig, imageUrls: string[], caption: string): Promise<string> {
  if (imageUrls.length < 2 || imageUrls.length > 10) throw new Error('Need 2–10 images')

  // 1. Upload each image as child container
  const childIds: string[] = []
  for (const url of imageUrls) {
    const id = await createContainer(cfg, url, true)
    childIds.push(id)
    await new Promise(r => setTimeout(r, 1200))
  }

  // 2. Wait for all children
  for (const id of childIds) await waitReady(cfg, id)

  // 3. Create carousel container
  const p = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: cfg.accessToken,
  })
  const r = await fetch(`${BASE}/${cfg.userId}/media`, { method: 'POST', body: p })
  const d = await r.json()
  if (d.error) throw new Error(`IG carousel: ${d.error.message}`)
  const carouselId = d.id

  // 4. Wait + publish
  await waitReady(cfg, carouselId)
  return await publishContainer(cfg, carouselId)
}

export async function verifyToken(cfg: IGConfig) {
  try {
    const r = await fetch(`${BASE}/${cfg.userId}?fields=username&access_token=${cfg.accessToken}`)
    const d = await r.json()
    if (d.error) return { valid: false, error: d.error.message }
    return { valid: true, username: d.username }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}
