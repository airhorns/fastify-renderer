import { promises as fs } from 'fs'
import path from 'path'
import * as Vite from 'vite'
import FastifyRenderer, { build } from '../src/node'
import { FastifyRendererPlugin } from '../src/node/Plugin'
import { ReactRenderer } from '../src/node/renderers/react/ReactRenderer'
import { kRenderOptions } from '../src/node/symbols'
import { newFastify } from './helpers'

describe('FastifyRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should throw if the fastify-renderer plugin was already registered in the same fastify context', async () => {
    const server = await newFastify()

    await server.register(FastifyRenderer)
    await expect(server.register(FastifyRenderer)).rejects.toThrow("The decorator 'vite' has already been added!")
  })

  test('should throw if the fastify-renderer plugin was already registered in a different context', async () => {
    const server = await newFastify()

    await server.register(FastifyRenderer)
    await expect(server.register(async (instance) => instance.register(FastifyRenderer))).rejects.toThrow()
  })

  test('should decorate the fastify instance with a "setRenderConfig" method', async () => {
    const server = await newFastify()
    await server.register(FastifyRenderer)
    expect(server.setRenderConfig).toBeInstanceOf(Function)
  })

  test('should set default render config for the instance', async () => {
    const server = await newFastify()

    expect(server[kRenderOptions]).toBeUndefined()
    await server.register(FastifyRenderer)
    expect(server[kRenderOptions]).toBeInstanceOf(Object)
  })

  test('should set the renderOptions on the new fastify instance context', async () => {
    const server = await newFastify()

    await server.register(FastifyRenderer)
    await server.register(async (instance) => {
      expect(server[kRenderOptions]).toEqual(instance[kRenderOptions])
    })
  })

  test('should mount vite routes at a prefix to avoid collision with user routes', async () => {
    const server = await newFastify()

    await server.register(FastifyRenderer)
    expect(server.printRoutes()).toMatch('/.vite/')
  })

  // test.skip('should use config from vite dev server in dev mode', async () => {
  // });

  test('should close vite devServer when fastify server is closing in dev mode', async () => {
    const devServer = await Vite.createServer()
    const closeSpy = jest.spyOn(devServer, 'close')
    jest.spyOn(Vite, 'createServer').mockImplementation(async () => devServer)

    const server = await newFastify()
    await server.register(FastifyRenderer, { devMode: true })
    await server.listen(0)
    await server.close()

    expect(closeSpy).toHaveBeenCalled()
  })

  test('should prepare routes', async () => {
    const server = await newFastify()
    const prepareSpy = jest.spyOn(ReactRenderer.prototype, 'prepare')

    await server.register(FastifyRenderer)
    await server.listen(0)
    await server.close()

    expect(prepareSpy).toHaveBeenCalled()
  })

  test('should do nothing if the registered route is not renderable', async () => {
    const server = await newFastify()
    const registerRouteSpy = jest.spyOn(FastifyRendererPlugin.prototype, 'registerRoute')

    await server.register(FastifyRenderer)
    server.get('/', async (_request, reply) => reply.send('Hello'))
    await server.inject({ method: 'GET', url: '/' })

    expect(registerRouteSpy).toHaveBeenCalledTimes(0)
  })

  test("should register the route in the plugin if it's renderable", async () => {
    const server = await newFastify()
    const registerRouteSpy = jest.spyOn(FastifyRendererPlugin.prototype, 'registerRoute').mockImplementation(jest.fn())

    await server.register(FastifyRenderer)
    server.get('/', { render: 'renderable-module-path' }, async (request, reply) => reply.send('Hello'))
    await server.inject({ method: 'GET', url: '/' })

    expect(registerRouteSpy).toHaveBeenCalledTimes(1)
  })

  test('should return the route props if content-type is application/json', async () => {
    const server = await newFastify()
    jest.spyOn(FastifyRendererPlugin.prototype, 'registerRoute').mockImplementation(jest.fn())

    await server.register(FastifyRenderer)
    server.get('/', { render: 'renderable-module-path' }, async (_request, _reply) => ({ a: 1, b: 2 }))
    const response = await server.inject({ method: 'GET', url: '/', headers: { Accept: 'application/json' } })

    expect(response.body).toEqual(JSON.stringify({ props: { a: 1, b: 2 } }))
  })

  test('should render and return html if content-type is text/html', async () => {
    const htmlContent = '<html><body>test content</body></html>'

    jest.spyOn(ReactRenderer.prototype, 'render').mockImplementation(async (render) => render.reply.send(htmlContent))
    jest.spyOn(FastifyRendererPlugin.prototype, 'registerRoute').mockImplementation(jest.fn())

    const server = await newFastify()
    await server.register(FastifyRenderer)
    server.get('/', { render: 'renderable-module-path' }, async (_request, _reply) => ({ a: 1, b: 2 }))
    const response = await server.inject({ method: 'GET', url: '/', headers: { Accept: 'text/html' } })

    expect(response.body).toEqual(htmlContent)
  })

  test('should set content-type to text/plain and return a message', async () => {
    const server = await newFastify()
    jest.spyOn(FastifyRendererPlugin.prototype, 'registerRoute').mockImplementation(jest.fn())

    await server.register(FastifyRenderer)
    server.get('/', { render: 'renderable-module-path' }, async (_request, _reply) => ({ a: 1, b: 2 }))
    const response = await server.inject({ method: 'GET', url: '/', headers: { Accept: 'other' } })

    expect(response.body).toEqual('Content type not supported')
  })
})

describe('build()', () => {
  test('should throw if the fastify-renderer plugin isnt available on the fastify instance', async () => {
    const server = await newFastify()
    void expect(build(server)).rejects.toThrow()
  })

  test('should build client and server side assets', async () => {
    const server = await newFastify()
    await server.register(FastifyRenderer)
    await server.listen(0)

    jest.spyOn(fs, 'writeFile').mockImplementation(jest.fn())
    jest.spyOn(path, 'join').mockImplementation(jest.fn())
    const viteBuildSpy = jest.spyOn(Vite, 'build').mockImplementation(jest.fn())

    await build(server)

    expect(viteBuildSpy).toHaveBeenCalledTimes(2)
  })
})
