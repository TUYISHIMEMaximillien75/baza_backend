export class AuthUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  status: string;
  emailVerified: boolean;
  roles: string[];
}

export class AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
}
