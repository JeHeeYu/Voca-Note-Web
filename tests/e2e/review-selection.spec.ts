import { expect, test } from '@playwright/test'
import { emptyDraft, type SavedWord } from '../../src/shared/models/word'

for (const presentation of ['single', 'batch'] as const) {
  for (const scope of ['all', 'due', 'mistakes'] as const) {
    test(`${presentation} review uses the ${scope} scope without leaking priority into all words`, async ({
      page,
    }) => {
      const now = Date.now()
      const day = 86_400_000
      const words: SavedWord[] = Array.from({ length: 20 }, (_, index) => {
        const category = ['learned', 'new', 'due', 'mistake'][index % 4]
        return {
          ...emptyDraft(),
          id: String(index),
          word: `${category} ${index}`,
          meaning: `${category} 뜻 ${index}`,
          createdAt: category === 'new' ? now : now - 90 * day,
          updatedAt: now,
          correctCount: category === 'new' ? 0 : category === 'due' ? 4 : 10,
          incorrectCount: category === 'mistake' ? 20 : category === 'due' ? 1 : 0,
          reviewStreak: category === 'learned' ? 10 : 0,
          reviewIntervalDays: category === 'learned' ? 30 : 0,
          lastReviewedAt: category === 'new' ? null : now - day,
          nextReviewAt: category === 'new' ? null : category === 'due' ? now - day : now + 30 * day,
        }
      })
      await page.addInitScript((words) => {
        localStorage.setItem(
          'voca-note:demo:v1',
          JSON.stringify({ words, sessions: [], settings: { sessionSize: 5, dailyGoal: 15 } }),
        )
      }, words)
      await page.goto('/')
      await page.getByRole('button', { name: '먼저 둘러보기' }).click()
      await page
        .getByRole('navigation', { name: '메인 메뉴', exact: true })
        .getByRole('link', { name: '단어 연습' })
        .click()
      const labels = { all: '전체 단어', due: '오늘 복습', mistakes: '오답 노트' }
      await page.getByRole('radio', { name: new RegExp(labels[scope]) }).check()
      if (presentation === 'batch') {
        await page.getByRole('button', { name: /한 번에 풀기/ }).click()
      } else {
        await page
          .getByRole('button')
          .filter({ has: page.getByRole('heading', { name: '직접 쓰기', exact: true }) })
          .click()
      }
      // Fix the random draw so the assertion detects priority bias, not random variation.
      await page.evaluate(() => {
        Math.random = () => 0.999999
      })
      await page.getByRole('button', { name: '연습 시작하기' }).click()
      const expected =
        scope === 'all'
          ? words.slice(0, 5)
          : words.filter((word) => word.word.startsWith(scope === 'due' ? 'new ' : 'mistake '))
      if (presentation === 'batch') {
        await expect(page.getByRole('article')).toHaveCount(5)
        await expect(page.getByRole('article').getByRole('heading')).toHaveText(
          expected.map((word) => word.meaning),
        )
      } else {
        for (let index = 0; index < expected.length; index++) {
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(expected[index].meaning)
          await page.getByLabel('영어 단어 입력').fill(expected[index].word)
          await page.keyboard.press('Enter')
          await expect(
            page.getByRole('button', {
              name: index === 4 ? '학습 마치기' : '다음 단어',
              exact: true,
            }),
          ).toBeFocused()
          await page.keyboard.press('Enter')
        }
        await expect(page.getByText('학습 기록과 다음 복습 시간을 저장했어요.')).toBeVisible()
      }
    })
  }
}
