import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common'
import { ConfigService } from './config.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('update-spec')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getSpec() {
    return this.configService.getSpec()
  }

  @Put('update-spec')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateSpec(@Body() body: unknown) {
    return this.configService.updateSpec(body)
  }
}
