import { Injectable } from '@nestjs/common'
import { readFile } from 'fs/promises'
import * as path from 'path'

@Injectable()
export class ConfigService {
  async getSpec(): Promise<unknown> {
    const content = await readFile(path.join(__dirname, '../config/update-spec.json'), 'utf-8')
    return JSON.parse(content)
  }
}
