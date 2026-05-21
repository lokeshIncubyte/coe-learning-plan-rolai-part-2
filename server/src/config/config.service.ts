import { Injectable } from '@nestjs/common'
import { readFile, writeFile } from 'fs/promises'
import * as path from 'path'

@Injectable()
export class ConfigService {
  private readonly specPath = path.join(__dirname, '../config/update-spec.json')

  async getSpec(): Promise<unknown> {
    const content = await readFile(this.specPath, 'utf-8')
    return JSON.parse(content)
  }

  async updateSpec(spec: unknown): Promise<void> {
    await writeFile(this.specPath, JSON.stringify(spec, null, 2), 'utf-8')
  }
}
