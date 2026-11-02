import type { ContentfulStatusCode } from 'hono/utils/http-status'

/** An error we expect and want to show to the client as { error: message }. */
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (m: string) => new ApiError(400, m)
export const notFound = (m: string) => new ApiError(404, m)
export const conflict = (m: string) => new ApiError(409, m)
export const unprocessable = (m: string) => new ApiError(422, m)
