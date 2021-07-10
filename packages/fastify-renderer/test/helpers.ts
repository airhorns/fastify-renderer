import fastify, { FastifyServerOptions } from 'fastify'
import fastifyAccepts from 'fastify-accepts'
import Middie from 'middie'
import { FastifyRendererOptions, FastifyRendererPlugin } from '../src/node/Plugin'
import { RenderBus } from '../src/node/RenderBus'
import { ReactRenderer, ReactRendererOptions } from '../src/node/renderers/react/ReactRenderer'

export const newFastify = async (options?: FastifyServerOptions) => {
  const server = fastify(options)
  await server.register(fastifyAccepts)
  await server.register(Middie)
  return server
}

export const newRenderBus = () => {
  return new RenderBus()
}

export const newFastifyRendererPlugin = (options: FastifyRendererOptions = {}) => {
  return new FastifyRendererPlugin(options)
}

export const newReactRenderer = (options?: ReactRendererOptions): ReactRenderer => {
  const plugin = newFastifyRendererPlugin({ renderer: options })
  return plugin.renderer as ReactRenderer
}
