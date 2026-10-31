export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? ''
  if (code.includes('popup-closed') || code.includes('cancelled-popup'))
    return '로그인이 취소되었어요. 다시 시도해 주세요.'
  if (code.includes('popup-blocked')) return '브라우저의 팝업을 허용한 후 다시 로그인해 주세요.'
  if (code.includes('unauthorized-domain'))
    return '이 주소에서 로그인이 허용되지 않았어요. Firebase 승인 도메인을 확인해 주세요.'
  if (code.includes('permission-denied'))
    return '데이터 접근 권한이 없어요. 앱과 같은 계정인지 확인해 주세요.'
  if (code.includes('unavailable') || code.includes('network'))
    return '연결이 원활하지 않아요. 인터넷 연결을 확인하고 다시 시도해 주세요.'
  return error instanceof Error
    ? error.message
    : '작업을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.'
}
