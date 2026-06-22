import type { CodeGenerator } from '@/ports/code-generator'

export class FakeCodeGenerator implements CodeGenerator {
  constructor(private code = '123456') {}

  generate(): string {
    return this.code
  }
}
