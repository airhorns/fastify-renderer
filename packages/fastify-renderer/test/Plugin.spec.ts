import fs from 'fs'
import path from 'path'
import { DefaultDocumentTemplate } from '../src/node/DocumentTemplate'
import { FastifyRendererOptions } from '../src/node/Plugin'
import { RenderBus } from '../src/node/RenderBus'
// import * as ReactRendererModule from '../src/node/renderers/react/ReactRenderer';
import { ReactRenderer } from '../src/node/renderers/react/ReactRenderer'
import { RenderableRoute } from '../src/node/renderers/Renderer'
import { newFastifyRendererPlugin } from './helpers'

jest.mock('fs')
jest.mock('../src/node/renderers/react/ReactRenderer')

describe('FastifyRendererPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fs.readFileSync = jest.fn().mockImplementation(() => '{ "test": "value" }')
  })

  test('should create a new instance with default options', async () => {
    const plugin = newFastifyRendererPlugin({})

    expect(plugin.devMode).toEqual(true)
    expect(plugin.viteBase).toEqual('/.vite/')
    expect(plugin.assetsHost).toEqual('')
    expect(plugin.hooks).toEqual([])
    expect(plugin.clientOutDir).toEqual(path.join(process.cwd(), 'dist', 'client', plugin.viteBase))
    expect(plugin.serverOutDir).toEqual(path.join(process.cwd(), 'dist', 'server'))
    expect(fs.readFileSync).toHaveBeenCalledTimes(0)
    expect(ReactRenderer).toBeCalledWith(plugin, { type: 'react', mode: 'streaming' })
  })

  test('should create a new instance with the provided options', async () => {
    const options: FastifyRendererOptions = {
      outDir: '/custom/out/dir',
      renderer: { type: 'react', mode: 'sync' },
      devMode: false,
      assetsHost: 'https://custom.asset.host',
    }
    const plugin = newFastifyRendererPlugin(options)

    expect(plugin.devMode).toEqual(false)
    expect(plugin.viteBase).toEqual('/.vite/')
    expect(plugin.assetsHost).toEqual(options.assetsHost)
    expect(plugin.hooks).toEqual([])
    expect(plugin.clientOutDir).toEqual(path.join(options.outDir as string, 'client', plugin.viteBase))
    expect(plugin.serverOutDir).toEqual(path.join(options.outDir as string, 'server'))
    expect(fs.readFileSync).toHaveBeenCalledTimes(2)
    expect(ReactRenderer).toBeCalledWith(plugin, options.renderer)
  })

  describe('clientAssetPath()', () => {
    test('should return the client asset path that will be accessible from the browser', async () => {
      const options: FastifyRendererOptions = {
        outDir: '/custom/out/dir',
        renderer: { type: 'react', mode: 'sync' },
        devMode: false,
      }
      const plugin = newFastifyRendererPlugin(options)
      expect(plugin.clientAssetPath('file.css')).toEqual(path.join(plugin.viteBase, 'file.css'))
    })

    test('should prepend the provided assetHost to the generated path', async () => {
      const options: FastifyRendererOptions = {
        outDir: '/custom/out/dir',
        renderer: { type: 'react', mode: 'sync' },
        devMode: false,
        assetsHost: 'https://custom.asset.host',
      }
      const plugin = newFastifyRendererPlugin(options)
      expect(plugin.clientAssetPath('file.css')).toContain(options.assetsHost)
    })
  })

  describe('pushImportTagsFromManifest()', () => {
    test('should throw when an entry is not found in the manifest', async () => {
      const plugin = newFastifyRendererPlugin({} as FastifyRendererOptions)
      const bus = new RenderBus()
      expect(() => plugin.pushImportTagsFromManifest(bus, 'entry-name')).toThrow()
    })

    // TODO: Generate the manifest file to test this
    test.skip('should push all import tags from the manifest to the render bus', async () => {
      // const options: FastifyRendererOptions = {
      //   outDir: '/custom/out/dir',
      //   renderer: { type: 'react', mode: 'sync' },
      //   devMode: false,
      //   assetsHost: 'https://custom.asset.host',
      // };
      // const plugin = newFastifyRendererPlugin(options);
      // const bus = new RenderBus();
      // expect(plugin.pushImportTagsFromManifest(bus, 'test')).toBe(true);
    })

    test.skip('should add the root module as a script tag to the bus', async () => {
      // TODO:
    })

    test.skip('should add descendent modules as preloaded modules to the bus', async () => {
      // TODO:
    })
  })

  describe('registerRoute()', () => {
    test('should add a registered route to the routes array', async () => {
      const plugin = newFastifyRendererPlugin({})
      const route: RenderableRoute = {
        url: 'route-url',
        renderable: 'renderable-component-path',
        layout: 'layout',
        base: 'base',
        document: DefaultDocumentTemplate,
      }

      expect(plugin.routes.length).toEqual(0)

      plugin.registerRoute(route)

      expect(plugin.routes.length).toEqual(1)
      expect(plugin.routes[0]).toEqual(route)
    })
  })
})
