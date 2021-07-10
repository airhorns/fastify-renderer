import { RenderBus } from '../node/RenderBus'
import { newRenderBus } from './helpers'

describe('RenderBus', () => {
  let renderBus: RenderBus
  const testKey = 'test-key'
  const testContent = 'test-content'

  beforeEach(() => {
    renderBus = newRenderBus()
  })

  test('should add the content to the correct stack', async () => {
    expect(renderBus.stacks[testKey]).toBeUndefined()

    renderBus.push(testKey, testContent)

    expect(renderBus.stacks[testKey]).toBeInstanceOf(Array)
    expect(renderBus.stacks[testKey].length).toEqual(1)
    expect(renderBus.stacks[testKey][0]).toEqual(testContent)
  })

  test('should return the stack with the specified key', async () => {
    expect(renderBus.stack(testKey)).toEqual([])

    renderBus.push(testKey, testContent)

    const stack = renderBus.stack(testKey)

    expect(stack).toBeInstanceOf(Array)
    expect(stack.length).toEqual(1)
    expect(stack[0]).toEqual(testContent)
  })

  describe('preloadModule', () => {
    const path = 'module-path'

    test('should push a newlink tag to "head" stack and mark the path as included', async () => {
      expect(renderBus.stack('head')).toEqual([])

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').length).toEqual(1)
    })

    test('should not include a path if its already included', async () => {
      expect(renderBus.stack('head')).toEqual([])

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').length).toEqual(1)

      renderBus.preloadModule(path)
      expect(renderBus.stack('head').length).toEqual(1)
    })
  })

  describe('linkStylesheet', () => {
    const path = 'module-path'

    test('should push a new link tag to "head" stack and mark the path as included', async () => {
      expect(renderBus.stack('head')).toEqual([])

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').length).toEqual(1)
    })

    test('should not include a path if its already included', async () => {
      expect(renderBus.stack('head')).toEqual([])

      renderBus.preloadModule(path)

      expect(renderBus.included.has(path)).toEqual(true)
      expect(renderBus.stack('head').length).toEqual(1)

      renderBus.preloadModule(path)
      expect(renderBus.stack('head').length).toEqual(1)
    })
  })
})
