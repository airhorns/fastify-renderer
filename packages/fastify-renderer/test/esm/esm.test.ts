import { spawnSync } from 'child_process'
import { join } from 'path'
import semver from 'semver'

describe('Native ESM import', () => {
  const defaultExportTest = semver.lt(process.versions.node, '13.3.0') ? it.skip : it
  const namedExportTest = semver.lt(process.versions.node, '14.13.0') ? it.skip : it

  defaultExportTest('should be able to use default export', () => {
    const { status, stdout, stderr } = spawnSync('node', [join(__dirname, 'default-esm-export.mjs')], {
      encoding: 'utf-8',
    })

    if (status != 0) {
      console.error({ stdout, stderr })
    }
    expect(status).toBe(0)
  })

  namedExportTest('should be able to use named export', () => {
    const { status, stdout, stderr } = spawnSync('node', [join(__dirname, 'named-esm-export.mjs')], {
      encoding: 'utf-8',
    })
    if (status != 0) {
      console.error({ stdout, stderr })
    }
    expect(status).toBe(0)
  })
})
