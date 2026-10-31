import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
export default function RouteError() {
  const error = useRouteError()
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">
        {!error || (isRouteErrorResponse(error) && error.status === 404)
          ? '페이지를 찾을 수 없어요.'
          : '화면을 불러오지 못했어요.'}
      </h1>
      <p className="mt-3 text-muted">페이지를 새로 열어 다시 시도해 주세요.</p>
      <a href="/" className="btn btn-primary mt-6">
        처음으로
      </a>
    </div>
  )
}
