/* eslint-disable @typescript-eslint/require-await */
import { FastifyInstance } from 'fastify'
import 'fastify-accepts'
import fp from 'fastify-plugin'
import fastifyStatic from 'fastify-static'
import { promises as fs } from 'fs'
import 'middie'
import path from 'path'
import { build as viteBuild, createServer, InlineConfig, resolveConfig, ResolvedConfig, ViteDevServer } from 'vite'
import { DefaultDocumentTemplate } from './DocumentTemplate'
import { FastifyRendererOptions, FastifyRendererPlugin } from './Plugin'
import { Render, RenderableRoute, RenderOptions } from './renderers/Renderer'
import { kRendererPlugin, kRendererViteOptions, kRenderOptions } from './symbols'
import { wrap } from './tracing'
import './types' // necessary to make sure that the fastify types are augmented
import { ServerRenderer } from './types'
import { mapFilepathToEntrypointName } from './utils'

declare module 'fastify' {
  interface FastifyInstance {
    [kRendererPlugin]: FastifyRendererPlugin
    [kRendererViteOptions]: InlineConfig
    [kRenderOptions]: RenderOptions
    setRenderConfig(options: FastifyRendererOptions): void
  }
}

const FastifyRenderer = fp<FastifyRendererOptions>(
  async (fastify, incomingOptions) => {
    const plugin = new FastifyRendererPlugin(incomingOptions)
    let vite: ViteDevServer

    fastify.decorate('vite', {
      getter() {
        return vite
      },
    })

    if (fastify[kRendererPlugin]) {
      throw new Error(
        "Can't register fastify-renderer-plugin more than once -- register it once then use `setRenderConfig` to change options for different encapsulation contexts"
      )
    }

    fastify[kRendererPlugin] = plugin

    fastify.addHook('onRegister', (instance) => {
      const innerOptions = { ...instance[kRenderOptions] }
      instance[kRenderOptions] = innerOptions
    })

    fastify.decorate('setRenderConfig', function (this: FastifyInstance, config: Partial<RenderOptions>) {
      const newOptions = { ...this[kRenderOptions], ...config }
      if (newOptions.base.endsWith('/')) {
        this.log.warn(`fastify-renderer base paths shouldn't end in a slash, got ${newOptions.base}`)
      }
      this[kRenderOptions] = newOptions
    })

    fastify.setRenderConfig({
      base: incomingOptions.base || '',
      layout: incomingOptions.layout || require.resolve('./renderers/react/DefaultLayout'),
      document: incomingOptions.document || DefaultDocumentTemplate,
    })

    // Wrap routes that have the `render` option set to invoke the rendererer with the result of the route handler as the props
    fastify.addHook('onRoute', function (this: FastifyInstance, routeOptions) {
      if (routeOptions.render) {
        const oldHandler = wrap('fastify-renderer.getProps', routeOptions.handler as ServerRenderer<any>)
        const renderable = routeOptions.render
        const plugin = this[kRendererPlugin]
        const renderableRoute: RenderableRoute = { ...this[kRenderOptions], url: routeOptions.url, renderable }

        plugin.registerRoute(renderableRoute)

        routeOptions.handler = wrap('fastify-renderer.handler', async function (this: FastifyInstance, request, reply) {
          const props = await oldHandler.call(this, request, reply)

          void reply.header('Vary', 'Accept')
          switch (request.accepts().type(['html', 'json'])) {
            case 'json':
              await reply.type('application/json').send({ props })
              break
            case 'html':
              void reply.type('text/html')
              const render: Render<typeof props> = { ...renderableRoute, request, reply, props, renderable }
              await plugin.renderer.render(render)
              break
            default:
              await reply.type('text/plain').send('Content type not supported')
              break
          }
        })
      }
    })

    let devServer: ViteDevServer | undefined = undefined
    let viteMountInstance: FastifyInstance = fastify
    await fs.mkdir(plugin.clientOutDir, { recursive: true })

    // this nasty bit is to support vite's middlewares running at a prefix where they don't collide with other routes the user might have added
    // we use the fastify router's prefix functionality to only let vite operate on routes that match it's prefix
    await fastify.register(
      async (instance) => {
        viteMountInstance = instance

        // we need to register a wildcard route for all the files that vite might serve, which we use fastify-static to do
        // in dev mode, this is needed so the fastify router will recognize the route and dispatch it, which will then run the middleware chain, letting vite take over and serve the file
        // in production, this will actually serve the files that vite has built for the client
        void instance.register(fastifyStatic, {
          root: plugin.clientOutDir,
        })

        if (plugin.devMode) {
          // register a dummy route so the router knows vite will connect to itself for websocket hot module reloading at the root
          instance.get('/', async (_request, reply) => {
            await reply.status(404)
            await reply.send('Not found')
          })
        }
      },
      { prefix: plugin.viteBase }
    )

    // register vite once all the routes have been defined
    fastify.addHook('onReady', async () => {
      fastify[kRendererViteOptions] = {
        clearScreen: false,
        ...plugin.vite,
        plugins: [...(plugin.vite?.plugins || []), ...plugin.renderer.vitePlugins()],
        server: {
          middlewareMode: true,
          ...plugin.vite?.server,
        },
      }

      let config: ResolvedConfig

      if (plugin.devMode) {
        fastify.log.debug('booting vite dev server')
        devServer = await createServer(fastify[kRendererViteOptions])
        viteMountInstance.use(devServer.middlewares)
        config = devServer.config
      } else {
        config = await resolveConfig(fastify[kRendererViteOptions], 'serve')
      }

      await plugin.renderer.prepare(plugin.routes, config, devServer)
    })

    fastify.addHook('onClose', async (_, done) => {
      await devServer?.close()
      done()
    })
  },
  {
    fastify: '3.x',
    name: 'fastify-renderer',
    dependencies: ['fastify-accepts', 'middie'],
  }
)

module.exports = exports = FastifyRenderer
export default FastifyRenderer

export const build = async (fastify: FastifyInstance) => {
  const plugin = fastify[kRendererPlugin]
  if (!plugin) {
    throw new Error('No fastify-renderer registered to build, have all your fastify plugins been loaded?')
  }

  const log = fastify.log.child({ name: 'fastify-renderer' })

  const clientEntrypoints: Record<string, string> = {}
  const serverEntrypoints: Record<string, string> = {}
  for (const renderableRoute of plugin.routes) {
    const entrypointName = mapFilepathToEntrypointName(renderableRoute.renderable)
    clientEntrypoints[entrypointName] = plugin.renderer.buildVirtualClientEntrypointModuleID(renderableRoute)
    serverEntrypoints[entrypointName] = plugin.renderer.buildVirtualServerEntrypointModuleID(renderableRoute)

    serverEntrypoints[mapFilepathToEntrypointName(renderableRoute.layout)] = renderableRoute.layout
  }

  const vite = fastify[kRendererViteOptions]

  log.info(`Building ${Object.keys(clientEntrypoints).length} client side asset(s) to ${plugin.clientOutDir}`)
  await viteBuild({
    ...vite,
    build: {
      ...vite.build,
      outDir: plugin.clientOutDir,
      ssrManifest: true,
      manifest: true,
      rollupOptions: {
        input: clientEntrypoints,
        ...vite?.build?.rollupOptions,
      },
    },
  })

  log.info(`Building ${Object.keys(serverEntrypoints).length} server side side asset(s) for ${plugin.serverOutDir}`)
  await viteBuild({
    ...vite,
    build: {
      ...vite.build,
      outDir: plugin.serverOutDir,
      rollupOptions: {
        input: serverEntrypoints,
        ...vite?.build?.rollupOptions,
      },
      ssr: true,
    },
  })

  // Write a special manifest for the server side entrypoints
  // Somewhat strangely we also use virtual entrypoints for the server side code used during SSR --
  // that means that in production, the server needs to require code from a special spot to get the
  // SSR-safe version of each entrypoint. We write out our own manifest here because there's a bug
  // in rollup or vite that errors when trying to generate a manifest in SSR mode.
  // TODO(@ayoubelk): Figure out why we need this bit and if we can fix the issue? in rollup/vite
  const virtualModulesToRenderedEntrypoints = Object.fromEntries(
    Object.entries(serverEntrypoints).map(([key, value]) => [value, key])
  )
  await fs.writeFile(
    path.join(plugin.serverOutDir, 'virtual-manifest.json'),
    JSON.stringify(virtualModulesToRenderedEntrypoints, null, 2)
  )
}
