import { rm } from 'node:fs/promises'
import path from 'node:path'

type DevChildProcess = {
  exited: Promise<number>
  kill: (signal?: NodeJS.Signals | number) => void
}

type DevSignalSource = Pick<NodeJS.Process, 'off' | 'once'>

const parsePort = (value: string | undefined): number => {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 3000
  return port
}

export const resolveDevPort = (args: string[]): number => {
  const equalsArgument = args.find(
    (argument) => argument.startsWith('--port=') || argument.startsWith('-p=')
  )
  if (equalsArgument) return parsePort(equalsArgument.slice(equalsArgument.indexOf('=') + 1))
  const index = args.findIndex((argument) => argument === '--port' || argument === '-p')
  return index === -1 ? 3000 : parsePort(args[index + 1])
}

export const resolveDevHost = (args: string[]): string => {
  const equalsArgument = args.find(
    (argument) => argument.startsWith('--host=') || argument.startsWith('-H=')
  )
  if (equalsArgument)
    return equalsArgument.slice(equalsArgument.indexOf('=') + 1).trim() || 'localhost'
  const index = args.findIndex((argument) => argument === '--host' || argument === '-H')
  return index === -1 ? 'localhost' : args[index + 1]?.trim() || 'localhost'
}

export const resolveDevOrigin = (args: string[]): string => {
  const rawHost = resolveDevHost(args)
  const protocol = rawHost.startsWith('https://') ? 'https' : 'http'
  const host = rawHost.replace(/^https?:\/\//, '').replace(/:\d+$/, '')
  const browserHost = ['0.0.0.0', '::', '[::]'].includes(host) ? 'localhost' : host
  const formattedHost = browserHost.includes(':') ? `[${browserHost}]` : browserHost
  return `${protocol}://${formattedHost}:${resolveDevPort(args)}`
}

export const cleanDevDatabase = async (directory: string): Promise<void> => {
  await rm(directory, { recursive: true, force: true })
}

export const waitForDevChildExit = async (
  child: DevChildProcess,
  signalSource: DevSignalSource = process
): Promise<number> => {
  let forwarded = false
  const forward = (signal: NodeJS.Signals) => {
    if (forwarded) return
    forwarded = true
    child.kill(signal)
  }
  const interrupt = () => forward('SIGINT')
  const terminate = () => forward('SIGTERM')
  signalSource.once('SIGINT', interrupt)
  signalSource.once('SIGTERM', terminate)
  try {
    return await child.exited
  } finally {
    signalSource.off('SIGINT', interrupt)
    signalSource.off('SIGTERM', terminate)
  }
}

const main = async () => {
  const args = process.argv.slice(2)
  const shouldClean = args.includes('--clean')
  const forwardedArgs = args.filter((argument) => argument !== '--clean')
  const defaultDatabase = path.resolve(process.cwd(), '.data/pglite')
  if (shouldClean) {
    await cleanDevDatabase(defaultDatabase)
    console.info(`[dev] cleaned ${defaultDatabase}`)
  }
  const child = Bun.spawn(['bun', 'x', 'nuxt', 'dev', ...forwardedArgs], {
    cwd: process.cwd(),
    env: { ...process.env, APP_URL: resolveDevOrigin(forwardedArgs) },
    stdio: ['inherit', 'inherit', 'inherit']
  })
  process.exitCode = await waitForDevChildExit(child)
}

if (import.meta.main) await main()
