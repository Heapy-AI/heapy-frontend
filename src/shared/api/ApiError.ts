/** 서버 인증 오류와 네트워크 오류를 구분한다. 작성자: 김진우 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly traceId?: string,
  ) {
    super(message);
  }
}
