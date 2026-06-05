import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SessionService } from './session.service'

@Controller('session')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  listSessions(@Request() req: any) {
    return this.sessionService.listForUser(req.user.id)
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.sessionService.getHistory(id)
  }

  @Get(':id/export')
  exportSession(@Param('id') id: string) {
    return this.sessionService.exportSession(id)
  }
}
