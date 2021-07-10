// import { ReactRenderer } from "../../src/node/renderers/react/ReactRenderer";
import { DefaultDocumentTemplate } from '../../src/node/DocumentTemplate'
import { RenderableRoute } from '../../src/node/renderers/Renderer'
import { newReactRenderer } from '../helpers'

describe('ReactRenderer', () => {
  test('should create an instance and initialize the client module path', async () => {
    const renderer = newReactRenderer()
    expect(renderer.clientModulePath).not.toBeUndefined()
  })

  describe('vitePlugins()', () => {
    test('should return an array of vite plugins', async () => {
      const renderer = newReactRenderer()
      const plugins = renderer.vitePlugins()

      expect(plugins).toBeInstanceOf(Array)
      expect(plugins.length).toBeGreaterThan(0)
    })
  })

  describe('prepare()', () => {
    test.skip('should update viteConfig and set the routes array', async () => {
      return
    })

    test.skip('should eagerly require all endpoints in production mode', async () => {
      return
    })
  })

  describe('render()', () => {
    test.skip('should use the provided plugin hooks transform functions', async () => {
      return
    })

    test.skip('should render in streaming mode', async () => {
      return
    })

    test.skip('should render in sync mode', async () => {
      return
    })

    test.skip('should throw on rendering failure', async () => {
      return
    })
  })

  describe('buildVirtualClientEntrypointModuleID()', () => {
    test('should return the path to hydrate the render', async () => {
      const renderer = newReactRenderer()
      const route: RenderableRoute = {
        url: 'test-url',
        renderable: 'rend',
        layout: './RedLayout',
        document: DefaultDocumentTemplate,
        base: '',
      }

      expect(renderer.buildVirtualClientEntrypointModuleID(route)).not.toBeUndefined()
    })
  })

  describe('buildVirtualServerEntrypointModuleID()', () => {
    test('should return the path to run the render server side', async () => {
      const renderer = newReactRenderer()
      const route: RenderableRoute = {
        url: 'test-url',
        renderable: 'rend',
        layout: './RedLayout',
        document: DefaultDocumentTemplate,
        base: '',
      }

      expect(renderer.buildVirtualServerEntrypointModuleID(route)).not.toBeUndefined()
    })
  })

  describe('entrypointScriptTagSrcForClient()', () => {
    test.skip('should throw if no manifest entry is found for the given module id', async () => {
      return
    })

    test.skip('should return in dev mode the correct path to the module', async () => {
      return
    })

    test.skip('should return in prod mode the matching manifest entry', async () => {
      return
    })
  })

  describe('entrypointRequirePathForServer()', () => {
    test.skip('should throw if no manifest entry is found for the given module id', async () => {
      return
    })

    test.skip('should return in dev mode an entrypoint name', async () => {
      return
    })

    test.skip('should return in prod mode the matching manifest entry', async () => {
      return
    })
  })
})
