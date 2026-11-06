import { expect, test, type Page } from '@playwright/test'
import { emptyDraft, type SavedWord } from '../../src/shared/models/word'
const samples = [
  ['apple', '사과', '사과나무'],
  ['pear', '배', '배나무'],
  ['grape', '포도', '포도나무'],
  ['peach', '복숭아', '복숭아나무'],
  ['lemon', '레몬', '레몬나무'],
  ['melon', '멜론', '참외'],
  ['record', '기록, 음반', '기록하다'],
  ['flourish', '번창하다, 잘 자라다', '무성하다'],
] as const
const words: SavedWord[] = samples.map(([word, meaning, second]) => ({
  ...emptyDraft(),
  id: word,
  word,
  meaning,
  meanings: [
    { meaning, partOfSpeech: 'noun' },
    { meaning: second, partOfSpeech: 'verb' },
  ],
  correctCount: 0,
  incorrectCount: 0,
  reviewStreak: 0,
  reviewIntervalDays: 0,
  createdAt: 1,
  updatedAt: 1,
  lastReviewedAt: null,
  nextReviewAt: null,
}))
async function setup(page: Page, source = words) {
  await page.goto('/')
  await page.evaluate(
    (words) =>
      localStorage.setItem(
        'voca-note:demo:v1',
        JSON.stringify({ words, sessions: [], settings: { sessionSize: 5, dailyGoal: 15 } }),
      ),
    source,
  )
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await page
    .getByRole('navigation', { name: '메인 메뉴', exact: true })
    .getByRole('link', { name: '단어 연습' })
    .click()
  await expect(page.getByRole('heading', { name: '기억을 꺼내는 시간.' })).toBeVisible()
}
async function mode(page: Page, name: string) {
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .click()
}
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('voca-note:demo:v1')!).sessions)

test('Korean meaning single accepts any sense, keeps composition Enter, rejects wrong answers, saves and retries', async ({
  page,
}) => {
  await setup(
    page,
    words.filter((w) => w.id === 'record'),
  )
  await mode(page, '한글 뜻 맞히기')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('record')
  const input = page.getByLabel('한글 뜻 입력')
  await input.fill('음 반')
  const prevented = await input.evaluate((el) => {
    const e = new KeyboardEvent('keydown', {
      key: 'Enter',
      isComposing: true,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(prevented).toBe(true)
  await expect(page.getByText('정확해요. 잘 기억하고 있어요!')).toHaveCount(0)
  await input.press('Enter')
  await expect(page.getByText('정확해요. 잘 기억하고 있어요!')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect(await saved(page)).toMatchObject([{ mode: 'meaning_writing', correctCount: 1 }])
  await page.getByRole('button', { name: '다른 방식으로 연습' }).click()
  await mode(page, '한글 뜻 맞히기')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await page.getByLabel('한글 뜻 입력').fill('기록합니다')
  await page.getByRole('button', { name: '정답 확인', exact: true }).click()
  await expect(page.getByText('괜찮아요. 한 번 더 기억해봐요.')).toBeVisible()
  await page.getByRole('button', { name: '학습 마치기' }).click()
  await page.getByRole('button', { name: '오답 다시 연습' }).click()
  await page.getByLabel('한글 뜻 입력').fill('기 록 하 다')
  await page.getByRole('button', { name: '정답 확인', exact: true }).click()
  await expect(page.getByText('정확해요. 잘 기억하고 있어요!')).toBeVisible()
})

test('Korean meaning batch accepts second senses on mobile and stores one session', async ({
  page,
}) => {
  await setup(page)
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await mode(page, '한글 뜻 맞히기')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  const cards = page.getByRole('article')
  for (let i = 0; i < (await cards.count()); i++) {
    const prompt = await cards.nth(i).getByRole('heading').innerText()
    const answer = words.find((w) => w.word === prompt)!.meanings[1].meaning
    await page.getByLabel(`${i + 1}번 답`, { exact: true }).fill([...answer].join(' '))
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '5문제 중 5문제 정답' })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect(await saved(page)).toMatchObject([
    { mode: 'meaning_writing', questionCount: 5, correctCount: 5 },
  ])
})

test('crossword supports clues, shared cells, validation, mobile, grading and review history', async ({
  page,
}) => {
  await setup(page)
  await mode(page, '가로세로 낱말')
  await expect(page.getByRole('group', { name: '진행 방식' })).toHaveCount(0)
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await expect(page.getByRole('heading', { name: '가로세로, 기억을 이어봐요.' })).toBeVisible()
  await page.getByRole('button', { name: '전체 정답 확인' }).click()
  await expect(page.getByRole('alert')).toContainText('비어 있는 칸')
  const clues = page.locator('[data-word-id]')
  const count = await clues.count()
  expect(count).toBeGreaterThanOrEqual(2)
  await page.setViewportSize({ width: 390, height: 844 })
  for (let i = 0; i < count; i++) {
    const clue = clues.nth(i)
    const answer = await clue.getAttribute('data-word-id')
    await clue.click()
    await page.getByLabel('선택한 낱말 입력').fill(answer!)
    await page.getByRole('button', { name: '낱말 채우기' }).click()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '전체 정답 확인' }).click()
  await expect(page.getByText(`${count}문제 중 ${count}문제 정답`, { exact: true })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  await expect(page.getByLabel('선택한 낱말 입력')).toHaveCount(0)
  expect(await saved(page)).toMatchObject([
    { mode: 'crossword', questionCount: count, correctCount: count },
  ])
  await page.getByRole('button', { name: '학습 요약 보기' }).click()
  await page.getByRole('button', { name: '전체 답안 다시 보기' }).click()
  expect(await saved(page)).toHaveLength(1)
})

test('disconnected crossword words explain the problem without starting or saving', async ({
  page,
}) => {
  await setup(page, [
    { ...words[0], id: 'aaa', word: 'aaa' },
    { ...words[1], id: 'bbb', word: 'bbb' },
  ])
  await mode(page, '가로세로 낱말')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await expect(page.getByRole('alert')).toContainText('서로 교차할 영어 단어가 부족')
  await expect(page.getByRole('heading', { name: '기억을 꺼내는 시간.' })).toBeVisible()
  expect(await saved(page)).toHaveLength(0)
})

test('crossword mistakes can be retried as writing even with only two words', async ({ page }) => {
  const source = [
    {
      ...words[0],
      id: 'cat',
      word: 'cat',
      meaning: '고양이',
      meanings: [{ meaning: '고양이', partOfSpeech: 'noun' as const }],
    },
    {
      ...words[1],
      id: 'car',
      word: 'car',
      meaning: '자동차',
      meanings: [{ meaning: '자동차', partOfSpeech: 'noun' as const }],
    },
  ]
  await setup(page, source)
  await mode(page, '가로세로 낱말')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  const clues = page.locator('[data-word-id]')
  for (let i = 0; i < 2; i++) {
    await clues.nth(i).click()
    await page
      .getByLabel('선택한 낱말 입력')
      .fill((await clues.nth(i).getAttribute('data-word-id'))!)
    await page.getByRole('button', { name: '낱말 채우기' }).click()
  }
  await clues.first().click()
  await page.getByLabel('선택한 낱말 입력').fill('xxx')
  await page.getByRole('button', { name: '낱말 채우기' }).click()
  await page.getByRole('button', { name: '전체 정답 확인' }).click()
  await expect(page.getByText('2문제 중 0문제 정답', { exact: true })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  await page.getByRole('button', { name: '학습 요약 보기' }).click()
  await page.getByRole('button', { name: '오답 다시 연습' }).click()
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(2)
  for (let i = 0; i < 2; i++) {
    const hint = await cards.nth(i).getByRole('heading').innerText()
    await page
      .getByLabel(`${i + 1}번 답`, { exact: true })
      .fill(source.find((w) => w.meaning === hint)!.word)
  }
  await page.getByRole('button', { name: '전체 정답 확인' }).click()
  await expect(page.getByRole('heading', { name: '2문제 중 2문제 정답' })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect(await saved(page)).toMatchObject([
    { mode: 'writing', correctCount: 2 },
    { mode: 'crossword', correctCount: 0 },
  ])
})
