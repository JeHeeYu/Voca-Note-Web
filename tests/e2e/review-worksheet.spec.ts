import { expect, test, type Page } from '@playwright/test'

const wordsByMeaning: Record<string, string> = {
  '뜻밖의 행운': 'serendipity',
  '받아들이다, 포용하다': 'embrace',
  '회복력이 있는': 'resilient',
  '오래 머무르다': 'linger',
  '관점, 시각': 'perspective',
  '의도적으로, 신중하게': 'deliberately',
  호기심: 'curiosity',
  '미묘한, 은은한': 'subtle',
  '번창하다, 잘 자라다': 'flourish',
  '고요한, 평온한': 'tranquil',
  '노력, 시도': 'endeavor',
  '감사하다, 진가를 알아보다': 'appreciate',
}
async function setup(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await page
    .getByRole('navigation', { name: '메인 메뉴', exact: true })
    .getByRole('link', { name: '단어 연습' })
    .click()
}
async function chooseMode(page: Page, mode: string) {
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: mode, exact: true }) })
    .click()
}
async function beginBatch(page: Page, count = 10) {
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await page.getByRole('button', { name: `${count}문제`, exact: true }).click()
  await page.getByRole('button', { name: '연습 시작하기' }).click()
}
async function storedSessions(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('voca-note:demo:v1') ?? '{}').sessions ?? [],
  )
}

test('Enter checks, then advances once; held and composing Enter never skip a question', async ({
  page,
}) => {
  await setup(page)
  await chooseMode(page, '직접 쓰기')
  await page.getByRole('button', { name: '5문제', exact: true }).click()
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  const answer = wordsByMeaning[await page.getByRole('heading', { level: 1 }).innerText()]
  await page.getByLabel('영어 단어 입력').fill(answer)
  await page.keyboard.down('Enter')
  await expect(page.getByText('정확해요. 잘 기억하고 있어요!')).toBeVisible()
  await expect(page.getByRole('button', { name: '다음 단어', exact: true })).toBeFocused()
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  await expect(page.getByText('1 / 5', { exact: true })).toBeVisible()
  const prevented = await page
    .getByRole('button', { name: '다음 단어', exact: true })
    .evaluate((button) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
      button.dispatchEvent(event)
      return event.defaultPrevented
    })
  expect(prevented).toBe(true)
  await expect(page.getByText('1 / 5', { exact: true })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('2 / 5', { exact: true })).toBeVisible()
  await expect(page.getByLabel('영어 단어 입력')).toBeFocused()
  await expect(page.getByLabel('영어 단어 입력')).toHaveValue('')
})

test('ten-question worksheet validates blanks, preserves list/grid answers, grades once, and retries mistakes', async ({
  page,
}) => {
  await setup(page)
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await page.getByRole('button', { name: '20문제', exact: true }).click()
  await expect(
    page.getByText('선택한 범위에서 연습할 수 있는 12개 단어를 모두 출제해요.'),
  ).toBeVisible()
  await page.getByLabel('이번 문제 수').fill('31')
  await expect(page.getByRole('button', { name: '연습 시작하기' })).toBeDisabled()
  await page.getByRole('button', { name: '10문제', exact: true }).click()
  await page.screenshot({ path: 'test-results/worksheet-setup.png', fullPage: true })
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(10)
  await page.getByLabel('1번 답', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('9문제')
  await expect(page.getByLabel('2번 답', { exact: true })).toBeFocused()
  expect(await storedSessions(page)).toHaveLength(0)
  const wrongAnswer = wordsByMeaning[await cards.nth(0).getByRole('heading').innerText()]
  for (let index = 1; index < 10; index++) {
    const answer = wordsByMeaning[await cards.nth(index).getByRole('heading').innerText()]
    const input = page.getByLabel(`${index + 1}번 답`, { exact: true })
    await input.fill(` ${answer.toUpperCase()} `)
    await input.press('Enter')
    if (index < 9) await expect(page.getByLabel(`${index + 2}번 답`, { exact: true })).toBeFocused()
  }
  await expect(page.getByRole('button', { name: '전체 정답 확인', exact: true })).toBeFocused()
  await expect(page.getByRole('list', { name: '단어의 뜻' })).toHaveCount(0)
  await page.getByRole('button', { name: '그리드', exact: true }).click()
  await expect(page.getByLabel('1번 답', { exact: true })).toHaveValue('wrong')
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/worksheet-grid.png', fullPage: false })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/worksheet-mobile.png', fullPage: false })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '리스트', exact: true }).click()
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).evaluate((button) => {
    ;(button as HTMLButtonElement).click()
    ;(button as HTMLButtonElement).click()
  })
  await expect(page.getByRole('heading', { name: '10문제 중 9문제 정답' })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  await expect(cards.nth(0).getByText(`정답: ${wrongAnswer}`, { exact: true })).toBeVisible()
  await expect(page.getByLabel('1번 답', { exact: true })).toHaveAttribute('readonly', '')
  const sessions = await storedSessions(page)
  expect(sessions).toHaveLength(1)
  expect(sessions[0]).toMatchObject({ mode: 'writing', questionCount: 10, correctCount: 9 })
  await page.getByRole('button', { name: '학습 요약 보기' }).click()
  await page.getByRole('button', { name: '전체 답안 다시 보기' }).click()
  await expect(page.getByRole('heading', { name: '10문제 중 9문제 정답' })).toBeVisible()
  expect(await storedSessions(page)).toHaveLength(1)
  await page.getByRole('button', { name: '학습 요약 보기' }).click()
  await page.getByRole('button', { name: '오답 다시 연습' }).click()
  await expect(cards).toHaveCount(1)
  await expect(page.getByLabel('1번 답', { exact: true })).toHaveValue('')
  await page.getByLabel('1번 답', { exact: true }).fill(wrongAnswer)
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '1문제 중 1문제 정답' })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect(await storedSessions(page)).toHaveLength(2)
})

test('twenty multiple-choice questions appear together and save a complete session', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const words = Array.from({ length: 20 }, (_, index) => ({
      id: `word-${index}`,
      word: `word ${index}`,
      meaning: `뜻 ${index}`,
      partOfSpeech: 'noun',
      meanings: [{ meaning: `뜻 ${index}`, partOfSpeech: 'noun' }],
      example: '',
      note: '',
      synonyms: [],
      antonyms: [],
      derivatives: [],
      confusableWords: [],
      collocations: [],
      correctCount: 0,
      incorrectCount: 0,
      reviewStreak: 0,
      reviewIntervalDays: 0,
      createdAt: 1,
      updatedAt: 1,
      lastReviewedAt: null,
      nextReviewAt: null,
    }))
    localStorage.setItem(
      'voca-note:demo:v1',
      JSON.stringify({ words, sessions: [], settings: { sessionSize: 20, dailyGoal: 20 } }),
    )
  })
  await setup(page)
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await chooseMode(page, '뜻 고르기')
  await expect(page.getByLabel('이번 문제 수')).toHaveValue('20')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(20)
  for (let index = 0; index < 20; index++) {
    const prompt = await cards.nth(index).getByRole('heading').innerText()
    await cards
      .nth(index)
      .getByRole('radio', { name: prompt.replace('word ', '뜻 '), exact: true })
      .check()
  }
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '20문제 중 20문제 정답' })).toBeVisible()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect((await storedSessions(page))[0]).toMatchObject({
    mode: 'multiple_choice',
    questionCount: 20,
    correctCount: 20,
  })
})

test('listening worksheet plays each word and reveals meanings only after batch grading', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = (utterance) => {
      document.documentElement.dataset.spoken = utterance.text
    }
  })
  await setup(page)
  await page.getByRole('button', { name: /한 번에 풀기/ }).click()
  await chooseMode(page, '듣고 쓰기')
  await page.getByRole('button', { name: '5문제', exact: true }).click()
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(5)
  for (let index = 0; index < 5; index++) {
    await cards.nth(index).getByRole('button', { name: '영어 발음 듣기' }).click()
    const spoken = await page.locator('html').getAttribute('data-spoken')
    expect(spoken).toBeTruthy()
    await page.getByLabel(`${index + 1}번 답`, { exact: true }).fill(spoken!)
  }
  await expect(page.getByRole('list', { name: '단어의 뜻' })).toHaveCount(0)
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('heading', { name: '5문제 중 5문제 정답' })).toBeVisible()
  await expect(page.getByRole('list', { name: '단어의 뜻' })).toHaveCount(5)
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect((await storedSessions(page))[0].mode).toBe('listening')
})

test('worksheet keeps answers and blocks leaving after a failed save, then retries once', async ({
  page,
}) => {
  await setup(page)
  await beginBatch(page, 5)
  for (let index = 0; index < 5; index++) {
    const meaning = await page.getByRole('article').nth(index).getByRole('heading').innerText()
    await page.getByLabel(`${index + 1}번 답`, { exact: true }).fill(wordsByMeaning[meaning])
  }
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    let fail = true
    Storage.prototype.setItem = function (key, value) {
      if (key === 'voca-note:demo:v1' && fail) {
        fail = false
        throw new DOMException('Quota', 'QuotaExceededError')
      }
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '전체 정답 확인', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('저장 공간')
  await expect(page.getByRole('heading', { name: '5문제 중 5문제 정답' })).toBeVisible()
  await page
    .getByRole('navigation', { name: '메인 메뉴', exact: true })
    .getByRole('link', { name: '오늘의 학습' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '계속하기' }).click()
  await page.getByRole('button', { name: '저장 다시 시도' }).click()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
  expect(await storedSessions(page)).toHaveLength(1)
})
