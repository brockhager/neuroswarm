'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Vote, BookOpen, Target, Award, Play, CheckCircle } from 'lucide-react'

export default function PortalDashboard() {
  const [userTier] = useState<'bronze' | 'silver' | 'gold' | 'diamond'>('silver')

  const stats = [
    { label: 'Your Contributions', value: '24', icon: Target, change: '+12%' },
    { label: 'Voting Power', value: '3', icon: Vote, change: 'Silver Badge' },
    { label: 'Learning Progress', value: '68%', icon: BookOpen, change: '2 modules left' },
    { label: 'Community Rank', value: '#127', icon: Award, change: 'Top 15%' },
  ]

  const recentActivity = [
    { action: 'Voted on roadmap proposal', time: '2 hours ago', type: 'vote' },
    { action: 'Completed "Validator Setup" module', time: '1 day ago', type: 'learn' },
    { action: 'Earned Silver Badge', time: '3 days ago', type: 'achievement' },
    { action: 'Commented on governance discussion', time: '5 days ago', type: 'community' },
  ]

  const learningPath = [
    { title: 'Getting Started with NeuroSwarm', progress: 100, status: 'completed' },
    { title: 'Understanding the Global Brain', progress: 75, status: 'in-progress' },
    { title: 'Validator Node Setup', progress: 100, status: 'completed' },
    { title: 'Governance Participation', progress: 30, status: 'in-progress' },
  ]

  const badgeColors = {
    bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    silver: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    diamond: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, Contributor!</h1>
                <p className="mt-2 text-white/90">
                  You&apos;re making great progress in the NeuroSwarm ecosystem.
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg ${badgeColors[userTier]} font-semibold`}>
                {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Badge
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/portal/learn" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Learning</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Courses & modules</p>
            </Link>
            <Link href="/portal/governance" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Vote className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Governance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Vote on proposals</p>
            </Link>
            <Link href="/portal/community" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Users className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Community</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Forum & mentorship</p>
            </Link>
            <Link href="/portal/admin-node-milestone" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Award className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Milestones</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest updates</p>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {stat.change}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Learning Path */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Learning Path
              </h2>
              <div className="space-y-4">
                {learningPath.map((module, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {module.title}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          module.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {module.status}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${module.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'vote' ? 'bg-blue-100 dark:bg-blue-900' :
                      activity.type === 'learn' ? 'bg-green-100 dark:bg-green-900' :
                      activity.type === 'achievement' ? 'bg-yellow-100 dark:bg-yellow-900' :
                      'bg-purple-100 dark:bg-purple-900'
                    }`}>
                      {activity.type === 'vote' && <Vote className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      {activity.type === 'learn' && <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      {activity.type === 'achievement' && <Award className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                      {activity.type === 'community' && <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Community Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Community Highlights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Alex Chen', tier: 'diamond', contributions: 156, joined: '6 months ago' },
                { name: 'Sarah Kim', tier: 'gold', contributions: 89, joined: '3 months ago' },
                { name: 'Marcus Johnson', tier: 'silver', contributions: 42, joined: '1 month ago' }
              ].map((contributor, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{contributor.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${badgeColors[contributor.tier as keyof typeof badgeColors]}`}>
                      {contributor.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contributor.contributions} contributions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Joined {contributor.joined}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
