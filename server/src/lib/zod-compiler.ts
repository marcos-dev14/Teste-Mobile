import type {
  FastifySchemaCompiler,
  FastifySerializerCompiler,
  FastifyTypeProvider,
} from 'fastify'
import type { z } from 'zod'

/**
 * Integra Zod ao Fastify: o mesmo schema valida a entrada (validatorCompiler) e
 * filtra/valida a saída (serializerCompiler). Campos não declarados no schema de
 * resposta são removidos, o que evita vazar colunas por engano.
 */
export interface ZodTypeProvider extends FastifyTypeProvider {
  validator: this['schema'] extends z.ZodType ? z.output<this['schema']> : unknown
  serializer: this['schema'] extends z.ZodType ? z.input<this['schema']> : unknown
}

export const validatorCompiler: FastifySchemaCompiler<z.ZodType> =
  ({ schema }) =>
  (data) => {
    const result = schema.safeParse(data)
    return result.success ? { value: result.data } : { error: result.error }
  }

export const serializerCompiler: FastifySerializerCompiler<z.ZodType> =
  ({ schema }) =>
  (data) =>
    JSON.stringify(schema.parse(data))
