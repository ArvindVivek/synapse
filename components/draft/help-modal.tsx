'use client'

/**
 * Help Modal - Explains the app's features and UI elements
 *
 * Provides users with information about:
 * - How the draft simulator works
 * - What each panel displays
 * - How AI recommendations work
 * - Role icons and their meanings
 */

import { useState } from 'react'
import {
  HelpIcon,
  CloseIcon,
  TopIcon,
  JungleIcon,
  MidIcon,
  AdcIcon,
  SupportIcon,
  UsersIcon,
  SearchIcon,
} from '@/components/ui/icons'

interface HelpModalProps {
  className?: string
}

export function HelpButton({ className = '' }: HelpModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors ${className}`}
        title="Help & Info"
      >
        <HelpIcon className="w-5 h-5" />
      </button>

      {isOpen && <HelpModal onClose={() => setIsOpen(false)} />}
    </>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-xl font-bold text-white">Synapse Help</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">What is Synapse?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Synapse is an AI-powered League of Legends draft assistant. It helps you make better
              picks and bans by analyzing team compositions, player tendencies, and champion matchups
              using professional play data.
            </p>
          </section>

          {/* How to Use */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">How to Draft</h3>
            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
              <li>Select your side (Blue or Red) and click Start Draft</li>
              <li>When it&apos;s your turn, click a champion in the grid to select them</li>
              <li>Click the BAN or LOCK IN button to confirm your choice</li>
              <li>The opponent AI will automatically make their picks</li>
              <li>Use AI recommendations and win rate predictions to guide your decisions</li>
            </ol>
          </section>

          {/* Role Icons */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Role Icons</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <TopIcon className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="text-white text-sm font-medium">Top Lane</div>
                  <div className="text-gray-500 text-xs">Bruisers, tanks, split-pushers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <JungleIcon className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-white text-sm font-medium">Jungle</div>
                  <div className="text-gray-500 text-xs">Gankers, objective control</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <MidIcon className="w-6 h-6 text-blue-400" />
                <div>
                  <div className="text-white text-sm font-medium">Mid Lane</div>
                  <div className="text-gray-500 text-xs">Mages, assassins, roamers</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <AdcIcon className="w-6 h-6 text-red-400" />
                <div>
                  <div className="text-white text-sm font-medium">ADC</div>
                  <div className="text-gray-500 text-xs">Attack damage carries</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-800/50 p-3 rounded-lg">
                <SupportIcon className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-white text-sm font-medium">Support</div>
                  <div className="text-gray-500 text-xs">Enchanters, tanks, playmakers</div>
                </div>
              </div>
            </div>
          </section>

          {/* UI Elements */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Understanding the UI</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <UsersIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium">Opponent Analysis (Left Sidebar)</span>
                </div>
                <p className="text-gray-400">
                  Select opponent players to see their champion pools and predicted picks.
                  Stats show win rates, signature champions, and games played.
                </p>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span className="text-white font-medium">Team Columns (Blue/Red)</span>
                </div>
                <p className="text-gray-400">
                  Shows bans and picks for each team. Current action slot pulses yellow.
                  Damage type breakdown shows AP/AD/Mixed composition balance.
                </p>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <SearchIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-white font-medium">Champion Grid (Center)</span>
                </div>
                <p className="text-gray-400">
                  All available champions. Use role filters or search to find champions.
                  Grayed out champions are already picked or banned.
                </p>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-white font-medium mb-1">Win Rate Display</div>
                <p className="text-gray-400">
                  Shows predicted win probability based on current picks. Updates after each
                  selection. Green = favorable, Yellow = neutral, Red = unfavorable.
                </p>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-white font-medium mb-1">AI Suggestions</div>
                <p className="text-gray-400">
                  The AI analyzes team compositions, synergies, and matchups to recommend
                  optimal picks. Suggestions appear in the bottom action bar.
                </p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Pro Tips</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">*</span>
                <span>Balance AP and AD damage to prevent enemies from stacking one armor type</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">*</span>
                <span>Blue side gets first pick; Red side gets counter-pick advantage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">*</span>
                <span>Ban high-priority champions that counter your planned composition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">*</span>
                <span>Check opponent player pools to predict and counter their picks</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <p className="text-gray-500 text-xs text-center">
            Synapse - AI-Powered Draft Assistant
          </p>
        </div>
      </div>
    </div>
  )
}
