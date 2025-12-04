import Ajv from 'ajv';
import { readFile } from 'fs/promises';

let _validator = null;

export async function loadErrorResponseValidator() {
  if (_validator) return _validator;
  const raw = await readFile(new URL('../../../contracts/RouterErrorResponse.json', import.meta.url));
  const schema = JSON.parse(raw.toString());
  const ajv = new Ajv({ allErrors: true, strict: false });
  _validator = ajv.compile(schema);
  return _validator;
}

export async function validateRouterErrorSchema(obj) {
  const validate = await loadErrorResponseValidator();
  const ok = validate(obj);
  return { ok, errors: validate.errors || [] };
}

export default validateRouterErrorSchema;
