'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9]">
      {/* Header with back button */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-black/[0.08]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#6b7280] hover:bg-[#f1f5f9] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Simulator
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Retirement Simulator Tutorial</h1>
            <p className="text-sm text-[#6b7280] mt-1">Learn how to master 3-bucket retirement planning in minutes</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h2 className="text-4xl font-bold mb-6 text-slate-900">
            Master Retirement Planning<br />in 5 Minutes
          </h2>
          <p className="text-lg text-[#6b7280] mb-8 max-w-2xl mx-auto">
            Watch this step-by-step walkthrough to see how to set up your first retirement scenario using the 3-bucket strategy.
          </p>
        </section>

        {/* Video/GIF Section */}
        <section className="mb-16 bg-white rounded-2xl shadow-sm border border-black/[0.08] overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-6">
              <p className="text-sm text-[#6b7280] mb-4">💻 Step-by-step animation showing the quickstart workflow</p>
              <img
                src="/quickstart.gif"
                alt="Retirement Simulator Quickstart - 5 Step Workflow"
                className="w-full h-auto rounded-lg shadow-md border border-black/[0.08]"
              />
              <p className="text-xs text-[#9ca3af] mt-4">Each frame shows 2.5 seconds | Total: 12.5 seconds</p>
            </div>
          </div>
        </section>

        {/* 5-Step Guide */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold mb-8 text-slate-900">The 5-Step Quickstart</h3>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-white rounded-xl p-6 border border-black/[0.08] hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1D9E75] text-white font-bold">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Enter Client & Advisor Info</h4>
                  <p className="text-[#6b7280] mb-3">At the top of the app, you'll see three text fields:</p>
                  <ul className="space-y-2 text-sm text-[#6b7280] ml-4">
                    <li><strong>• Advisor Firm Name</strong> — Your firm name (e.g., "Wealth Partners")</li>
                    <li><strong>• Advisor Name</strong> — Your name (e.g., "Sarah Mitchell")</li>
                    <li><strong>• Client Name</strong> — Client name (e.g., "Rajesh Kumar")</li>
                  </ul>
                  <p className="text-xs text-[#9ca3af] mt-3 italic">These appear on the PDF report. You can also customize the brand color.</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-xl p-6 border border-black/[0.08] hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1D9E75] text-white font-bold">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Set the Age Timeline</h4>
                  <p className="text-[#6b7280] mb-3">On the left panel, find the <strong>Age Timeline</strong> section:</p>
                  <ul className="space-y-2 text-sm text-[#6b7280] ml-4">
                    <li><strong>• Current Age</strong> — Their age today</li>
                    <li><strong>• Retirement Age</strong> — When they stop working (default: 60)</li>
                    <li><strong>• Life Expectancy</strong> — Planning horizon (default: 85)</li>
                  </ul>
                  <p className="text-xs text-[#9ca3af] mt-3">Use +/− buttons to adjust. Timeline shows Accumulation (5 yr) and Drawdown (25 yr) phases.</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-xl p-6 border border-black/[0.08] hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1D9E75] text-white font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Enter Monthly Retirement Expenses</h4>
                  <p className="text-[#6b7280] mb-3">Find the <strong>Monthly Costs Post-Retirement</strong> field and enter a number like <code className="bg-slate-100 px-2 py-1 rounded text-sm">300000</code>.</p>
                  <p className="text-sm text-[#6b7280]">The app shows:</p>
                  <ul className="space-y-1 text-sm text-[#6b7280] ml-4 mt-2">
                    <li><strong>• Annual today:</strong> Automatically calculated (₹36 lakhs for ₹300k/month)</li>
                    <li><strong>• Spending Profile:</strong> Leave "Spending Smile" off for now</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-xl p-6 border border-black/[0.08] hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1D9E75] text-white font-bold">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Select Bucket Strategy</h4>
                  <p className="text-[#6b7280] mb-3">In the <strong>Bucket Strategy</strong> section, click one of these three buttons:</p>
                  <ul className="space-y-2 text-sm text-[#6b7280] ml-4">
                    <li><strong>• 1-Bucket</strong> — Single blended portfolio (simplest)</li>
                    <li><strong>• 2-Bucket</strong> — Safety + Growth split</li>
                    <li><strong>• 3-Bucket</strong> — Cash → Debt → Equity cascade (most detailed)</li>
                  </ul>
                  <p className="text-xs text-[#9ca3af] mt-3">For this walkthrough, select <strong>3-Bucket</strong>.</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white rounded-xl p-6 border border-black/[0.08] hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1D9E75] text-white font-bold">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Run All 3 Strategies in Parallel</h4>
                  <p className="text-[#6b7280] mb-3">Scroll down to find the blue button: <strong>"Run all 3 strategies in parallel and compare results"</strong></p>
                  <p className="text-sm text-[#6b7280]">Click it. You'll see:</p>
                  <ul className="space-y-1 text-sm text-[#6b7280] ml-4 mt-2">
                    <li><strong>• Strategy Comparison</strong> table — Shows funded status, portfolio at retirement, capital horizon</li>
                    <li><strong>• Portfolio Trajectory</strong> chart — Visualizes B1/B2/B3 over the entire retirement horizon</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="mb-16 bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] rounded-2xl p-8 border border-[#6EE7B7]">
          <h3 className="text-xl font-bold text-[#065F46] mb-4">✓ What You'll See</h3>
          <div className="grid gap-4 text-[#065F46]">
            <p><strong>Funded Status:</strong> Shows "Funded" ✓ or "Shortfall" ✗ — does the money last?</p>
            <p><strong>Portfolio at Retirement:</strong> Wealth on day 1 of retirement</p>
            <p><strong>Terminal Estate Value:</strong> What's left at life expectancy (both nominal and real)</p>
            <p><strong>Capital Horizon:</strong> How long the portfolio lasts</p>
            <p><strong>Portfolio Trajectory:</strong> Chart showing how each bucket (Cash, Debt, Equity) fills and drains over 25 retirement years</p>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="bg-gradient-to-br from-[#FEF3C7] to-[#FCD34D] rounded-2xl p-8 border border-[#FBBF24] mb-16">
          <h3 className="text-xl font-bold text-[#78350F] mb-4">⚠️ If You See "Shortfall"</h3>
          <p className="text-[#78350F] mb-4">This means the portfolio exhausts before life expectancy. To fix it:</p>
          <ul className="space-y-2 text-[#78350F]">
            <li>• Reduce monthly expenses</li>
            <li>• Increase retirement age</li>
            <li>• Increase return rate assumptions</li>
            <li>• Add more assets</li>
          </ul>
          <p className="text-sm text-[#92400E] mt-4">Try adjusting one variable at a time and re-run to see impact instantly.</p>
        </section>

        {/* Next Steps */}
        <section className="bg-white rounded-2xl p-8 border border-black/[0.08] mb-16">
          <h3 className="text-xl font-bold text-slate-900 mb-4">🎯 Next Steps</h3>
          <p className="text-[#6b7280] mb-4">Once you've completed this 5-minute flow, you can:</p>
          <ul className="space-y-3 text-[#6b7280]">
            <li><strong>📊 Add Assets</strong> — List current holdings by asset class</li>
            <li><strong>📅 Add Milestones</strong> — Major expenses, legacy goals, income steps</li>
            <li><strong>🔍 Stress Test</strong> — See how your plan handles market crashes</li>
            <li><strong>📄 Export PDF</strong> — Share polished reports with clients</li>
          </ul>
        </section>

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1D9E75] text-white font-semibold rounded-lg hover:bg-[#0F7F5C] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
