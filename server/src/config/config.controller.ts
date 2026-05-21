import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common'
import { ConfigService } from './config.service'

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('update-spec')
  async getSpec() {
    return this.configService.getSpec()
  }

  @Put('update-spec')
  @HttpCode(HttpStatus.OK)
  async updateSpec(@Body() body: unknown) {
    return this.configService.updateSpec(body)
  }
}
