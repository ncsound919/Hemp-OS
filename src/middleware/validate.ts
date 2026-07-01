/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validates req.body/query/params/headers against a combined schema and
 * writes the PARSED (coerced/transformed/defaulted) result back onto the
 * request object, so downstream handlers see sanitized data instead of the
 * raw input that merely happened to pass validation.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      }) as { body?: any; query?: any; params?: any };

      // Write back only the keys the schema actually validated, in case the
      // schema doesn't declare all four (e.g. a body-only schema).
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      // headers intentionally not overwritten: Express/Node populate req.headers
      // with additional runtime metadata; overwriting wholesale risks dropping
      // fields the schema didn't explicitly model.

      next();
    } catch (err) {
      next(err);
    }
  };
}
