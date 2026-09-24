import { rm } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
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

const normalizeHost = (host: string): string => {
  const normalized = host.replace(/^https?:\/\//, '').trim()
  if (normalized.startsWith('[')) {
    const bracket = normalized.indexOf(']')
    return bracket === -1 ? normalized : normalized.slice(1, bracket)
  }
  const colon = normalized.indexOf(':')
  return colon !== -1 && colon === normalized.lastIndexOf(':')
    ? normalized.slice(0, colon)
    : normalized
}

const originHost = (host: string) => (host.includes(':') ? `[${host}]` : host)

export const localNetworkHosts = (): string[] =>
  Object.values(networkInterfaces())
    .flatMap((addresses) => addresses ?? [])
    .filter((address) => address.family === 'IPv4' && !address.internal)
    .map((address) => address.address)

export const buildDevAuthOrigins = (
  host: string,
  port: number,
  networkHosts = localNetworkHosts()
): string[] => {
  const protocol = host.startsWith('https://') ? 'https' : 'http'
  const normalized = normalizeHost(host) || 'localhost'
  const hosts = new Set([normalized])
  if (normalized === '0.0.0.0' || normalized === '::') {
    hosts.add('localhost')
    hosts.add('127.0.0.1')
    networkHosts.forEach((address) => hosts.add(address))
  }
  return [...hosts].map((entry) => `${protocol}://${originHost(entry)}:${port}`)
}

export const resolveDevOrigin = (args: string[]): string =>
  buildDevAuthOrigins(resolveDevHost(args), resolveDevPort(args))[0]!

export const cleanDevDatabase = async (directory: string): Promise<void> => {
  await rm(directory, { recursive: true, force: true })
}

export const prepareDevDatabase = async (directory: string, clean: boolean): Promise<void> => {
  if (clean) {
    await cleanDevDatabase(directory)
    console.info(`[dev] cleaned ${directory}`)
  }
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
  await prepareDevDatabase(defaultDatabase, shouldClean)
  const origins = buildDevAuthOrigins(resolveDevHost(forwardedArgs), resolveDevPort(forwardedArgs))
  const child = Bun.spawn(['bun', 'x', 'nuxt', 'dev', ...forwardedArgs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_URL: origins[0],
      PORTAL_AUTO_SEED: 'true',
      BETTER_AUTH_TRUSTED_ORIGINS: [
        ...origins,
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [])
      ]
        .map((origin) => origin.trim())
        .filter(Boolean)
        .filter((origin, index, all) => all.indexOf(origin) === index)
        .join(',')
    },
    stdio: ['inherit', 'inherit', 'inherit']
  })
  process.exitCode = await waitForDevChildExit(child)
}

if (import.meta.main) await main()
