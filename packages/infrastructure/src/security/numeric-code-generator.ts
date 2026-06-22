import { randomInt } from 'node:crypto'
import type { CodeGenerator } from '@taskin/application'

const CODE_CEILING = 1_000_000
const CODE_LENGTH = 6

export class NumericCodeGenerator implements CodeGenerator {
  generate(): string {
    return randomInt(0, CODE_CEILING).toString().padStart(CODE_LENGTH, '0')
  }
}
