import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthRole } from '../types/auth-role.enum';
import { AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      return false;
    }

    return (
      user.role === AuthRole.Admin ||
      user.type === AuthRole.Admin
    );
  }
}


