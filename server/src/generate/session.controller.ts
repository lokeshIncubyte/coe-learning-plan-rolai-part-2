import { Controller, Get, Param } from '@nestjs/common'
import { SessionService } from './session.service'

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':id/export')
  async exportSession(@Param('id') id: string) {
    return this.sessionService.exportSession(id)
  }
}
