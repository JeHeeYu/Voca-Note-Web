import { expect, test, type Page } from '@playwright/test'

const samples: Record<string, string> = {
  serendipity: '뜻밖의 행운',
  embrace: '받아들이다, 포용하다',
  resilient: '회복력이 있는',
  linger: '오래 머무르다',
  perspective: '관점, 시각',
  deliberately: '의도적으로, 신중하게',
  curiosity: '호기심',
  subtle: '미묘한, 은은한',
  flourish: '번창하다, 잘 자라다',
  tranquil: '고요한, 평온한',
  endeavor: '노력, 시도',
  appreciate: '감사하다, 진가를 알아보다',
}

async function enterDemo(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await expect(page.getByRole('heading', { name: '오늘도 한 단어씩.' })).toBeVisible()
}
async function menu(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: '메인 메뉴', exact: true })
    .getByRole('link', { name })
    .click()
}

test('desktop word CRUD, search, validation, and persistent demo storage', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await enterDemo(page)
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true })
  await page.getByRole('link', { name: '새 단어 추가' }).click()
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page.getByText('영어 단어를 입력해 주세요.')).toBeVisible()
  await page.getByLabel('영어 단어', { exact: false }).fill('  mindful  ')
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('마음을 쓰는')
  await page.getByLabel('품사·표현 1', { exact: true }).selectOption('adjective')
  await page.getByLabel('예문', { exact: true }).fill('Be mindful of your surroundings.')
  await page.getByLabel('유의어', { exact: true }).fill('attentive, aware, AWARE')
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page).toHaveURL(/words\/new$/)
  await expect(page.getByLabel('영어 단어', { exact: false })).toHaveValue('')
  await expect(page.getByLabel('영어 단어', { exact: false })).toBeFocused()
  await menu(page, '나의 단어장')
  await expect(page.getByRole('link', { name: 'mindful', exact: true })).toBeVisible()
  await page.getByLabel('단어 검색').fill('attentive')
  await expect(page.getByText('1개의 단어', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'mindful', exact: true }).click()
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('주의 깊은')
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page.getByText('주의 깊은', { exact: true }).last()).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await menu(page, '나의 단어장')
  await page.getByRole('link', { name: 'mindful', exact: true }).click()
  await page.getByRole('button', { name: '이 단어 삭제' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '삭제하기' }).click()
  await expect(page.getByRole('link', { name: 'mindful', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const mode of ['기억 카드', '뜻 고르기', '직접 쓰기', '듣고 쓰기']) {
  test(`${mode}: complete five questions and save the session`, async ({ page }) => {
    if (mode === '듣고 쓰기')
      await page.addInitScript(() => {
        window.speechSynthesis.speak = (utterance) => {
          document.documentElement.dataset.spoken = utterance.text
        }
      })
    await enterDemo(page)
    await menu(page, '내 학습 설정')
    await page.getByLabel('한 번에 연습할 분량').fill('5')
    await page.getByRole('button', { name: '학습 설정 저장' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: '학습 설정을 저장했어요.' }),
    ).toBeVisible()
    await menu(page, '단어 연습')
    await page
      .getByRole('button')
      .filter({ has: page.getByRole('heading', { name: mode, exact: true }) })
      .click()
    await page.getByRole('button', { name: '연습 시작하기' }).click()
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(`${i + 1} / 5`, { exact: true })).toBeVisible()
      if (mode === '기억 카드') {
        await page.getByRole('button', { name: '뜻 확인하기' }).click()
        await page
          .getByRole('button', { name: i === 0 ? '다시 볼래요' : '기억했어요', exact: true })
          .click()
      } else {
        if (mode === '뜻 고르기') {
          const word = await page.getByRole('heading', { level: 1 }).innerText()
          await page.getByRole('button').filter({ hasText: samples[word] }).click()
        } else {
          let answer: string
          if (mode === '듣고 쓰기') {
            await page.getByRole('button', { name: '영어 발음 듣기' }).click()
            answer = (await page.locator('html').getAttribute('data-spoken')) || ''
            expect(answer).not.toBe('')
          } else {
            const meaning = await page.getByRole('heading', { level: 1 }).innerText()
            answer = Object.entries(samples).find(([, value]) => value === meaning)![0]
          }
          await page.getByLabel('영어 단어 입력').fill(` ${answer.toUpperCase()} `)
          await page.getByRole('button', { name: '정답 확인', exact: true }).click()
        }
        await expect(page.getByText('정확해요. 잘 기억하고 있어요!')).toBeVisible()
        await expect(
          page.getByRole('button', { name: i === 4 ? '학습 마치기' : '다음 단어', exact: true }),
        ).toBeFocused()
        await page.keyboard.press('Enter')
      }
    }
    await expect(page.getByRole('heading', { name: '오늘의 기억이 쌓였어요.' })).toBeVisible()
    await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
    const data = await page.evaluate(() => JSON.parse(localStorage.getItem('voca-note:demo:v1')!))
    expect(data.sessions).toHaveLength(1)
    expect(data.sessions[0].questionCount).toBe(5)
    expect(data.sessions[0].correctCount).toBe(mode === '기억 카드' ? 4 : 5)
    if (mode === '기억 카드') {
      await page.getByRole('button', { name: '오답 다시 연습' }).click()
      await expect(page.getByText('1 / 1', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: '뜻 확인하기' }).click()
      await page.getByRole('button', { name: '기억했어요', exact: true }).click()
      await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
    }
  })
}

test('mobile layout, edit navigation guard, and keyboard dialog escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await enterDemo(page)
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.getByRole('link', { name: '새 단어 추가' }).click()
  await page.getByLabel('영어 단어', { exact: false }).fill('unfinished')
  await page
    .getByRole('navigation', { name: '모바일 메뉴' })
    .getByRole('link', { name: '오늘의 학습' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('영어 단어', { exact: false })).toHaveValue('unfinished')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page
    .getByRole('navigation', { name: '모바일 메뉴' })
    .getByRole('link', { name: '오늘의 학습' })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: '나가기', exact: true }).click()
  await expect(page.getByRole('heading', { name: '오늘도 한 단어씩.' })).toBeVisible()
})

test('multiple meanings, per-meaning POS, continuous entry, search, and recall', async ({
  page,
}) => {
  await enterDemo(page)
  await page.getByRole('link', { name: '새 단어 추가' }).click()
  await page.getByLabel('영어 단어', { exact: false }).fill('record')
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('기록, 음반')
  await page.getByLabel('품사·표현 1', { exact: true }).selectOption('noun')
  await page.getByRole('button', { name: '쉼표로 뜻 나누기' }).click()
  await expect(page.getByRole('textbox', { name: /^뜻 1 / })).toHaveValue('기록')
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toHaveValue('음반')
  await expect(page.getByLabel('품사·표현 2', { exact: true })).toHaveValue('noun')
  await page.getByRole('button', { name: '뜻 추가', exact: true }).click()
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page.getByText('뜻을 입력해 주세요.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /^뜻 3 / })).toBeFocused()
  await page.getByRole('textbox', { name: /^뜻 3 / }).fill('기록하다')
  await page.getByLabel('품사·표현 3', { exact: true }).selectOption('verb')
  await page.getByRole('button', { name: '뜻 2 삭제', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toHaveValue('기록하다')
  await expect(page.getByLabel('품사·표현 2', { exact: true })).toHaveValue('verb')
  await page.screenshot({ path: 'test-results/meanings-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/meanings-mobile.png', fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page).toHaveURL(/words\/new$/)
  await expect(page.getByLabel('영어 단어', { exact: false })).toBeFocused()
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toHaveCount(0)
  await page.getByLabel('영어 단어', { exact: false }).fill('in time')
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('제시간에')
  await page.getByLabel('품사·표현 1', { exact: true }).selectOption('phrase')
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page.getByLabel('영어 단어', { exact: false })).toHaveValue('')
  await menu(page, '나의 단어장')
  await page.getByLabel('단어 검색').fill('기록하다')
  await expect(page.getByRole('link', { name: 'record', exact: true })).toBeVisible()
  await expect(page.getByText('동사 (v)', { exact: true }).last()).toBeVisible()
  await page.getByRole('link', { name: 'record', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /^뜻 2 / })).toHaveValue('기록하다')
  await expect(page.getByLabel('품사·표현 2', { exact: true })).toHaveValue('verb')
  await menu(page, '나의 단어장')
  await page.getByLabel('단어 검색').fill('phr')
  await expect(page.getByRole('link', { name: 'in time', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'in time', exact: true }).click()
  await expect(page.getByLabel('품사·표현 1', { exact: true })).toHaveValue('phrase')
  // Keep the word entered through the UI to make the recall assertions deterministic.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('voca-note:demo:v1')!)
    data.words = data.words.filter((word: { word: string }) => word.word === 'record')
    localStorage.setItem('voca-note:demo:v1', JSON.stringify(data))
  })
  await page.reload()
  await page.getByRole('button', { name: '먼저 둘러보기' }).click()
  await menu(page, '단어 연습')
  await page.getByRole('button', { name: '연습 시작하기' }).click()
  await page.getByRole('button', { name: '뜻 확인하기' }).click()
  await expect(
    page.getByRole('list', { name: '단어의 뜻' }).getByText('기록', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('list', { name: '단어의 뜻' }).getByText('기록하다', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('명사 (n)', { exact: true })).toBeVisible()
  await expect(page.getByText('동사 (v)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '기억했어요', exact: true }).click()
  await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
})

test('failed saves retain the complete draft and meaning limits are enforced', async ({ page }) => {
  await enterDemo(page)
  await page.getByRole('link', { name: '새 단어 추가' }).click()
  await page.getByLabel('영어 단어', { exact: false }).fill('record')
  await page.getByRole('textbox', { name: /^뜻 1 / }).fill('기록')
  await page.getByLabel('품사·표현 1', { exact: true }).selectOption('noun')
  for (let i = 2; i <= 10; i++) {
    await page.getByRole('button', { name: '뜻 추가', exact: true }).click()
    await page.locator(`#meaning-${i - 1}`).fill(`기록 ${i}`)
  }
  await expect(page.getByRole('button', { name: '뜻 추가', exact: true })).toBeDisabled()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
  })
  await page.getByRole('button', { name: '단어 저장하기' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/words\/new$/)
  await expect(page.getByLabel('영어 단어', { exact: false })).toHaveValue('record')
  await expect(page.locator('#meaning-9')).toHaveValue('기록 10')
  await expect(page.getByLabel('품사·표현 1', { exact: true })).toHaveValue('noun')
})
