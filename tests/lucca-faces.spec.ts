import { test, expect } from '@playwright/test'
import fs from 'fs'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

function randomIntFromInterval(min, max) {
  // Get a random integer between min and max, both included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const shuffleArray = array => {
  // Shuffle the array (in-place)
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}

test.skip('Save user state', async ({ page }) => {
  // To do manually:
  // - Launch in debug mode
  // - break after displaying the login page
  // - login manually and resume the test once the game page is displayed
  // --> current user session will be saved in user.json
  await page.goto('https://gitguardian.ilucca.net/faces/home')
  await expect(page).toHaveTitle(/Lucca faces/)
  await page.context().storageState({ path: 'user.json' })
})

test('Play the game', async ({ page }) => {
  await page.goto('https://gitguardian.ilucca.net/faces/home')
  await expect(page).toHaveTitle(/Lucca faces/)

  await page.getByRole('button', { name: 'Jouer' }).click()

  while (true) {
    await page.locator('app-game-state-loading div').nth(2).click()

    for (let i=1; i <= 10; i++) {

      // Get the possible answers (names of each person) and save them in a random order
      await expect(page.locator('.answers')).toBeVisible()
      const answers = page.locator('css=.answer')
      await expect(answers).toHaveCount(4)
      const names = await answers.allTextContents()
      shuffleArray(names)

      // Take a screenshot of the current photo to be guessed
      const newScreenshotFilename = `screenshots/screenshot-${names.join('-')}.png`
      await page.locator('css=.image').screenshot({ path: newScreenshotFilename })

      let foundAnswer = false
      for (const name of names) {
        // For each possible name, check if the screenshot of the person already exists
        const screenshotFilename = `screenshots/screenshot-${name.trim()}.png`
        const screenshotExists = fs.existsSync(screenshotFilename)

        if (screenshotExists) {
          // If we have a screenshot of the person, compare it to the current photo to be guessed
          const img1 = PNG.sync.read(fs.readFileSync(newScreenshotFilename))
          const img2 = PNG.sync.read(fs.readFileSync(screenshotFilename))
          console.log(`(${img1.width}, ${img1.height}), (${img2.width}, ${img2.height})`)
          const diff = pixelmatch(img1.data, img2.data, null, 261, 260, {threshold: 0.1})

          // If it matches:
          // - select the right answer
          // - remove the screenshot of the current photo to be guessed (no need to save it)
          // - we found the answer, so go to the next photo to be guessed
          if (diff <= 5000) {
            foundAnswer = true
            await answers.getByText(name.trim()).click()
            fs.rmSync(newScreenshotFilename)
            break
          }
        }
      }

      if (!foundAnswer) {
        // We did not find any matches, so pick a random guess and do not delete the screenshot
        // (it will have to be renamed manually with the right person name, in order to be used next time)
        console.log('did not find answer for:', names.join('-'))
        const randomNum = randomIntFromInterval(0, 3)
        await answers.locator(`nth=${randomNum}`).click()
      }

      if (i < 10) {
        // Wait for the next guess to be sent before getting the new available answers
        await page.waitForResponse('**/next')
      }
    }

    // Play again!
    console.log(await page.getByText(/Ton score.+/).textContent())
    await page.getByRole('button', { 'name': 'Rejouer' }).click()
  }
})
