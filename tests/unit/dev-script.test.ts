import { EventEmitter } from 'node:events'
import { mkdtemp, mkdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  cleanDevDatabase,
  resolveDevHost,
  resolveDevOrigin,
  resolveDevPort,
  waitForDevChildExit
} from '../../scripts/dev'

describe('development server wrapper', () => {
  it('forwards Nuxt port and host forms into the canonical app origin', () => {
    expect(resolveDevPort([])).toBe(3000)
    expect(resolveDevPort(['--port', '3002'])).toBe(3002)
    expect(resolveDevPort(['--port=3003'])).toBe(3003)
    expect(resolveDevPort(['-p=3004'])).toBe(3004)
    expect(resolveDevPort(['--port', 'invalid'])).toBe(3000)
    expect(resolveDevHost(['--host', '0.0.0.0'])).toBe('0.0.0.0')
    expect(resolveDevOrigin(['--host', '0.0.0.0', '--port', '3002'])).toBe('http://localhost:3002')
  })

  it('removes only the explicitly provided development database directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'portal-dev-clean-'))
    const database = join(root, 'pglite')
    await mkdir(database)
    await cleanDevDatabase(database)
    await expect(stat(database)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(root)).resolves.toBeDefined()
  })

  it('forwards one terminal signal and returns the child exit code', async () => {
    const signals = new EventEmitter()
    const kill = vi.fn()
    let finish: (code: number) => void = () => undefined
    const exited = new Promise<number>((resolve) => {
      finish = resolve
    })
    const result = waitForDevChildExit(
      { exited, kill },
      signals as Pick<NodeJS.Process, 'off' | 'once'>
    )
    signals.emit('SIGTERM')
    signals.emit('SIGINT')
    finish(0)
    await expect(result).resolves.toBe(0)
    expect(kill).toHaveBeenCalledTimes(1)
    expect(kill).toHaveBeenCalledWith('SIGTERM')
  })
})
