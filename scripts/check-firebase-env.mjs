import { loadEnv } from 'vite'
import { readFileSync } from 'node:fs'

const env = loadEnv('production', process.cwd(), 'VITE_')
const required = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'MESSAGING_SENDER_ID', 'APP_ID']
const missing = required.filter((key) => !env[`VITE_FIREBASE_${key}`]?.trim())
const project = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default
if (missing.length) {
  console.error(
    `Firebase 설정이 필요합니다: ${missing.map((key) => `VITE_FIREBASE_${key}`).join(', ')}`,
  )
  process.exit(1)
}
if (
  env.VITE_FIREBASE_PROJECT_ID !== project ||
  !env.VITE_FIREBASE_APP_ID.includes(':web:') ||
  env.VITE_USE_FIREBASE_EMULATORS === 'true'
) {
  console.error(
    '배포를 중단했습니다. 앱과 동일한 프로젝트의 웹 앱 설정 및 에뮬레이터 비활성화를 확인하세요.',
  )
  process.exit(1)
}
console.log(`Firebase 웹 설정 확인 완료: ${project}`)
