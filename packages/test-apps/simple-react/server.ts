import os from 'os'
import renderer from '../../fastify-renderer/src/node'
import { newFastify } from '../../fastify-renderer/test/helpers'

export const server = async () => {
  const server = await newFastify({
    logger: {
      level: 'info',
      prettyPrint: true,
    },
  })

  await server.register(renderer, {
    renderer: {
      type: 'react',
      mode: 'sync',
    },
    vite: {
      server: {
        hmr: {
          port: 27123,
        },
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-dom/server', 'wouter', 'path-to-regexp'],
      },
    },
  })

  server.get('/*', { render: require.resolve('./NotFound') }, async (request) => {
    return { params: request.params }
  })

  server.get('/', { render: require.resolve('./Home') }, async () => {
    return { time: Date.now() }
  })

  server.get('/about', { render: require.resolve('./About') }, async (request) => {
    return { hostname: os.hostname(), requestIP: request.ip }
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ layout: require.resolve('./RedLayout') })

    instance.get('/red/about', { render: require.resolve('./About') }, async (request) => {
      return { hostname: os.hostname(), requestIP: request.ip }
    })
  })

  await server.register(async (instance) => {
    instance.setRenderConfig({ base: '/subpath' })

    instance.get('/subpath/this', { render: require.resolve('./subapp/This') }, async (_request) => {
      return {}
    })
    instance.get('/subpath/that', { render: require.resolve('./subapp/That') }, async (_request) => {
      return {}
    })
  })

  await server.ready()
  return server
}

if (require.main === module) {
  void server().then((server) => {
    console.warn(server.printRoutes())
    return server.listen(3000)
  })
}
