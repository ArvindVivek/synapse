/**
 * POST /draft/new
 * Create a new draft session and redirect to draft page
 *
 * This is a server component that handles draft creation via form submission.
 */

import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'

/**
 * Server action to create a draft session
 * Generates ID directly and redirects (state managed client-side)
 */
async function createDraft(formData: FormData) {
  'use server'

  const userSide = formData.get('userSide') === 'red' ? 'red' : 'blue'
  const draftId = nanoid(12)

  // Redirect to draft page with userSide in query params
  redirect(`/draft/${draftId}?userSide=${userSide}`)
}

/**
 * Draft creation page
 *
 * Simple form that creates a draft and redirects
 */
export default function NewDraftPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">
          New Draft Session
        </h1>

        <form action={createDraft}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">
              Select Your Side
            </label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input
                  type="radio"
                  name="userSide"
                  value="blue"
                  defaultChecked
                  className="peer sr-only"
                />
                <div className="cursor-pointer text-center py-4 px-6 rounded-lg border-2 border-gray-600 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 hover:bg-gray-700 transition">
                  <span className="text-lg font-semibold">Blue Side</span>
                </div>
              </label>
              <label className="flex-1">
                <input
                  type="radio"
                  name="userSide"
                  value="red"
                  className="peer sr-only"
                />
                <div className="cursor-pointer text-center py-4 px-6 rounded-lg border-2 border-gray-600 peer-checked:border-red-500 peer-checked:bg-red-500/10 hover:bg-gray-700 transition">
                  <span className="text-lg font-semibold">Red Side</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Start Draft
          </button>
        </form>
      </div>
    </div>
  )
}
