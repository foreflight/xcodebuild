import { spawn } from 'child_process'
import * as core from '@actions/core'

type SpawnResult = number | NodeJS.Signals | null

export default async function xcodebuild(
  args: string[],
  verbosity: string
): Promise<void> {
  const verbosityMap: Record<string, string[]> = {
    xcpretty: ['xcpretty'],
    xcbeautify: ['xcbeautify', '--renderer', 'github-actions'],
  }

  const stdioOption = verbosity in verbosityMap ? 'pipe' : 'inherit'

  const xcodebuild = spawn('xcodebuild', args, {
    stdio: ['inherit', stdioOption, 'inherit'],
  })

  let promise = handleProcess(xcodebuild)

  if (verbosity in verbosityMap) {
    const formatter = spawn(
      verbosityMap[verbosity][0],
      verbosityMap[verbosity].slice(1),
      {
        stdio: ['pipe', process.stdout, 'inherit'],
      }
    )

    xcodebuild.stdout?.pipe(formatter.stdin)
    promise = promise.then((status0) => handleProcess(formatter, status0))
  }

  const status = await promise

  if (status !== 0) {
    core.info(`exec: xcodebuild ${args.join(' ')}`)
    throw new Error(`\`xcodebuild\` aborted (${status})`)
  }
}

function handleProcess(
  process: ReturnType<typeof spawn>,
  initialStatus?: SpawnResult
): Promise<SpawnResult> {
  return new Promise<SpawnResult>((fulfill, reject) => {
    process.on('error', reject)
    process.on('exit', (status, signal) =>
      fulfill(initialStatus ?? status ?? signal)
    )
  })
}
