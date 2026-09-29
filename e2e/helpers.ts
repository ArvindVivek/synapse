import { expect, type Page, type TestInfo } from "@playwright/test";

/** Collects console errors and page crashes; call `expectClean()` at the end of a test. */
export function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { errors, expectClean: () => expect(errors, errors.join("\n")).toEqual([]) };
}

export const isPhone = (info: TestInfo) => info.project.name === "phone";

/** Current turn from the board (21 = complete). */
export async function turnOf(page: Page): Promise<number> {
  return Number(await page.getByTestId("draft-screen").getAttribute("data-turn"));
}

/**
 * Plays the user's moves until the draft is complete: taps a suggested champion in the grid
 * (rank badge 1), then confirms. The practice opponent answers on its own.
 */
export async function playToEnd(page: Page) {
  for (let guard = 0; guard < 40; guard++) {
    const turn = await turnOf(page);
    if (turn === 21) break;
    const status = (await page.getByTestId("status").textContent()) ?? "";
    if (status.startsWith("Your")) {
      const top = page.getByRole("button", { name: /, suggestion 1$/ });
      await top.click();
      await expect(page.getByTestId("confirm")).toBeEnabled();
      await page.getByTestId("confirm").click();
      await expect.poll(() => turnOf(page)).toBeGreaterThan(turn);
    } else {
      await expect.poll(() => turnOf(page), { timeout: 5_000 }).toBeGreaterThan(turn);
    }
  }
  await expect(page.getByTestId("complete")).toBeVisible();
}
