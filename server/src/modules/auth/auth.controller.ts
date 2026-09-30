import { Body, Controller, Get, Post } from '@nestjs/common'
import { Public } from '../../common/public.decorator'
import { CurrentStaff } from '../../common/current-staff.decorator'
import { AuthService, type AuthUserDto } from './auth.service'
import { LoginDto } from './auth.dto'

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<{ token: string; user: AuthUserDto }> {
    return this.authService.login(dto)
  }

  /** 账号仍有效校验（含被禁用即时失效） */
  @Get('me')
  me(@CurrentStaff() staff: { id: string }): Promise<AuthUserDto> {
    return this.authService.getUserById(staff.id)
  }
}
