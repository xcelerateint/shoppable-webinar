import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      return null;
    }
    const { passwordHash, ...userData } = fullUser;
    return userData;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: CurrentUserData, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(user.id, updateUserDto);
    const { passwordHash, ...userData } = updatedUser;
    return userData;
  }
}
