import { ConfigService } from './config.service'
import { readFile } from 'fs/promises'

jest.mock('fs/promises')

describe('ConfigService', () => {
  it('getSpec reads update-spec.json and returns parsed object', async () => {
    const specContent = JSON.stringify({ variables: { hp: { min: 0, max: 100 } } })
    ;(readFile as jest.Mock).mockResolvedValue(specContent)
    const service = new ConfigService()
    const result = await service.getSpec()
    expect(readFile).toHaveBeenCalledWith(expect.stringContaining('update-spec.json'), 'utf-8')
    expect(result).toEqual({ variables: { hp: { min: 0, max: 100 } } })
  })
})

describe('ConfigService — error path', () => {
  it('propagates ENOENT when update-spec.json is missing', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    ;(readFile as jest.Mock).mockRejectedValue(enoent)
    const service = new ConfigService()
    await expect(service.getSpec()).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
