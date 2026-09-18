import { ApiError } from '../../shared/api/ApiError';

/** 연결 실패 문구가 아이디·비밀번호 오류를 덮지 않게 한다. 작성자: 김진우 */
export function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return '로그인 정보를 저장하지 못했어요. 다시 시도해 주세요.';
  if (error.status === 401 || error.code === 'AUTH-001')
    return '이메일 또는 비밀번호가 올바르지 않아요. 다시 확인해 주세요.';
  if (error.code === 'AUTH-002')
    return '이메일 인증을 완료한 뒤 로그인해 주세요.';
  if (error.status === 429)
    return '로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.';
  if (error.status === 0 || error.status >= 500)
    return '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  return error.message || '입력한 로그인 정보를 확인해 주세요.';
}
