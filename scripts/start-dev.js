#!/usr/bin/env node
'use strict'

const { spawn } = require('node:child_process')
const process = require('node:process')

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const runningProcesses = []
let othersStarted = false
let shuttingDown = false
let conceptbReadyBuffer = ''
const readinessTimeoutMs = 10000
let readinessTimeout = setTimeout(() => {
  startOtherApps('conceptb-life did not report readiness in time. Starting remaining apps...')
}, readinessTimeoutMs)

function startProcess(name, args) {
  const child = spawn(pnpmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  runningProcesses.push(child)

  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      forwardOutput(name, text, 'stdout')
      if (name === 'conceptb-life') {
        conceptbReadyBuffer += text
        checkConceptbReady()
      }
    })
  }

  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      forwardOutput(name, chunk.toString(), 'stderr')
    })
  }

  child.on('exit', (code, signal) => {
    if (!shuttingDown) {
      shutdown(typeof code === 'number' ? code : signal ? 1 : 0)
    }
  })

  child.on('error', (error) => {
    forwardOutput(name, `Process failed: ${error.message}\n`, 'stderr')
    shutdown(1)
  })

  return child
}

function forwardOutput(name, text, stream) {
  const prefix = `[${name}] `
  const lines = text.split(/(?<=\n)/)
  for (const line of lines) {
    if (!line) continue
    const output = prefix + line
    if (stream === 'stderr') {
      process.stderr.write(output)
    } else {
      process.stdout.write(output)
    }
  }
}

function checkConceptbReady() {
  if (othersStarted) {
    return
  }

  if (/ready in/i.test(conceptbReadyBuffer) || /Local:\s*https?:\/\//i.test(conceptbReadyBuffer)) {
    conceptbReadyBuffer = ''
    startOtherApps('conceptb-life is ready. Starting remaining apps...')
  }

  if (conceptbReadyBuffer.length > 2000) {
    conceptbReadyBuffer = conceptbReadyBuffer.slice(-2000)
  }
}

function shutdown(code) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  for (const child of runningProcesses) {
    if (!child.killed) {
      child.kill()
    }
  }

  process.exit(code)
}

process.on('SIGINT', () => {
  forwardOutput('dev-runner', 'Received SIGINT. Shutting down...\n', 'stdout')
  shutdown(0)
})

process.on('SIGTERM', () => {
  forwardOutput('dev-runner', 'Received SIGTERM. Shutting down...\n', 'stdout')
  shutdown(0)
})

startProcess('conceptb-life', ['run', 'dev:conceptb-life'])

function startOtherApps(message) {
  if (othersStarted) {
    return
  }

  othersStarted = true
  if (readinessTimeout) {
    clearTimeout(readinessTimeout)
    readinessTimeout = undefined
  }

  if (message) {
    forwardOutput('dev-runner', `${message}\n`, 'stdout')
  }

  startProcess('other-apps', [
    '-r',
    '--parallel',
    '--filter',
    'dividend-life',
    '--filter',
    'balance-life',
    '--filter',
    'health-life',
    '--filter',
    'wealth-life',
    'run',
    'dev',
  ])
}
