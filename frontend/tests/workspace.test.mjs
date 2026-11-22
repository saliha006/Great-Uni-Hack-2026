import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'

function storage() {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  }
}

test('the demo can finish and replay without changing saved study data or contacting FastAPI', async (t) => {
  let href = 'https://attune.test/study?from=dashboard#saved'
  let server
  const local = storage()
  const tab = storage()
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, 'https://backend.test/api/subjects')
    return Response.json([{ subject: { name: 'Live Study' } }])
  })
  globalThis.localStorage = local
  globalThis.sessionStorage = tab
  globalThis.window = {
    localStorage: local,
    sessionStorage: tab,
    get location() {
      const url = new URL(href)
      return Object.assign(url, {
        assign: (to) => { href = new URL(to, href).href },
        replace: (to) => { href = new URL(to, href).href },
      })
    },
  }
  t.after(async () => {
    await server?.close()
    delete globalThis.window
    delete globalThis.sessionStorage
    delete globalThis.localStorage
  })

  // A navigation unloads the browser modules. A fresh Vite module runner reproduces that here.
  async function load(apiUrl = '') {
    await server?.close()
    server = await createServer({
      configFile: false, envDir: false,
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) },
      server: { middlewareMode: true, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    const workspace = await server.ssrLoadModule('/src/lib/workspace.ts')
    const { api } = await server.ssrLoadModule('/src/api/client.ts')
    const { getLocal, setLocal } = await server.ssrLoadModule('/src/lib/local.ts')
    return { ...workspace, api, getLocal, setLocal }
  }

  const study = await load()
  const subject = await study.api.createSubject({ name: 'Saved subject', kind: 'PERFORMANCE' })
  await study.api.addMaterial(subject.id, { text: 'saved material '.repeat(30) })
  const session = await study.api.createSession({ subject_id: subject.id, method: 'PRACTICE_TEST' })
  const item = await study.api.nextItem(session.id)
  const resume = { session, subjectName: subject.name, itemsDone: 0, currentItem: item, savedAt: 'saved' }
  study.setLocal({ resume })
  const plan = await study.api.subjectState(subject.id)
  const original = [local.getItem(study.MOCK_STORAGE_KEY), local.getItem(study.LOCAL_STORAGE_KEY)]

  study.openTour()
  assert.equal(new URL(href).pathname, '/demo')
  const demo = await load('https://backend.test')
  const ada = await demo.api.devSeed('ada')
  assert.equal(demo.getLocal().resume, null)
  const seeded = await demo.api.insights(ada.subject_ids[0])
  await demo.api.devAdvanceDays(7)
  const sample = await demo.api.createSession({ subject_id: ada.subject_ids[0], method: 'PRACTICE_TEST' })
  const first = await demo.api.nextItem(sample.id)
  demo.setLocal({ resume: { ...resume, session: sample } })
  assert.equal((await demo.api.finish(sample.id)).probe_items.length, 5)
  await demo.api.probe(sample.id, { answers: [], felt_rating: 4 })
  assert.equal(globalThis.fetch.mock.callCount(), 0)
  assert.deepEqual([local.getItem(demo.MOCK_STORAGE_KEY), local.getItem(demo.LOCAL_STORAGE_KEY)], original)

  demo.openTour()
  const replay = await load('https://backend.test')
  assert.deepEqual(await replay.api.listSubjects(), [])
  assert.equal(replay.getLocal().resume, null)
  assert.deepEqual(await replay.api.devSeed('ada'), ada)
  assert.deepEqual(await replay.api.insights(ada.subject_ids[0]), seeded)
  await replay.api.devAdvanceDays(7)
  const replaySession = await replay.api.createSession({ subject_id: ada.subject_ids[0], method: 'PRACTICE_TEST' })
  assert.deepEqual(await replay.api.nextItem(replaySession.id), first)

  replay.leaveTour()
  assert.equal(href, 'https://attune.test/study?from=dashboard#saved')
  const restored = await load()
  assert.deepEqual(restored.getLocal().resume, resume)
  assert.deepEqual(await restored.api.subjectState(subject.id), plan)
  assert.ok((await restored.api.finish(session.id)).probe_items.length > 0)
  const live = await load('https://backend.test')
  assert.equal((await live.api.listSubjects())[0].subject.name, 'Live Study')
  assert.equal(globalThis.fetch.mock.callCount(), 1)
})
