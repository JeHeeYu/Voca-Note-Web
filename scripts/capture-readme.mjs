import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

// Fresh browser + demo repository only: never reads or writes an authenticated account.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://voca-note.web.app'
const output = new URL('../docs/screenshots/', import.meta.url).pathname
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.CI ? 'chromium' : 'chrome' })
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  })
  await page.goto(baseURL)
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await page.getByRole('heading', { name: '오늘도 한 단어씩.' }).waitFor()
  const menu = async (name) =>
    page
      .getByRole('navigation', { name: '메인 메뉴', exact: true })
      .getByRole('link', { name })
      .click()
  const capture = async (name) => {
    await page.evaluate(() => document.fonts.ready)
    const close = page.getByRole('button', { name: '알림 닫기' })
    if (await close.isVisible()) await close.click()
    await page.evaluate(() => {
      document.activeElement?.blur()
      scrollTo({ top: 0, behavior: 'instant' })
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    await page.screenshot({ path: `${output}${name}.png`, fullPage: true })
  }
  await capture('home')
  await menu('나의 단어장')
  await page.getByLabel('단어 검색').waitFor()
  await capture('library')
  await page.getByRole('link', { name: '새 단어 추가' }).click()
  await page.getByLabel('영어 단어', { exact: false }).fill('record')
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('기록, 음반')
  await page.getByLabel('품사·표현 1', { exact: true }).selectOption('noun')
  await page.getByRole('button', { name: /뜻 추가/ }).click()
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toBeFocused()
  await page.getByRole('textbox', { name: /^뜻 2 / }).fill('기록하다')
  await page.getByLabel('품사·표현 2', { exact: true }).selectOption('verb')
  await page.getByLabel('예문', { exact: true }).fill('Please record your ideas.')
  await page.getByLabel('나만의 메모', { exact: true }).fill('명사와 동사로 모두 사용할 수 있어요.')
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toHaveValue('기록하다')
  await expect(page.getByLabel('예문', { exact: true })).toHaveValue('Please record your ideas.')
  await capture('meanings')
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await page.getByLabel('영어 단어', { exact: false }).waitFor()
  await menu('단어 연습')
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await page.getByRole('button', { name: '10문제', exact: true }).click()
  await capture('review-setup')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await page.getByRole('button', { name: '그리드', exact: true }).click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('voca-note:demo:v1')))
  const byMeaning = new Map(
    stored.words.flatMap((word) =>
      (word.meanings?.length ? word.meanings : [{ meaning: word.meaning }]).map((entry) => [
        entry.meaning,
        word.word,
      ]),
    ),
  )
  const cards = page.getByRole('article')
  for (let index = 0; index < 10; index++) {
    const meaning = await cards.nth(index).getByRole('heading').innerText()
    await page
      .getByLabel(`${index + 1}번 답`, { exact: true })
      .fill(index === 0 ? 'review' : byMeaning.get(meaning))
  }
  await capture('worksheet')
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await page.getByText('학습 기록과 다음 복습 시간을 저장했어요.').waitFor()
  await capture('worksheet-results')
  console.log(`Saved six demo screenshots to ${output}`)
} finally {
  await browser.close()
}
