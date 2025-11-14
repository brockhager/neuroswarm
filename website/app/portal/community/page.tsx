'use client'

import { useState } from 'react'
import { Brain, MessageSquare, Users, Search, Plus, Heart, Reply } from 'lucide-react'

interface ForumThread {
  id: string
  title: string
  author: string
  authorBadge: string
  category: string
  replies: number
  likes: number
  lastActivity: string
  isPinned?: boolean
  isHot?: boolean
}

interface MentorshipRequest {
  id: string
  mentee: string
  menteeBadge: string
  skill: string
  description: string
  status: 'open' | 'matched' | 'completed'
}

export default function CommunityHub() {
  const [activeTab, setActiveTab] = useState<'forum' | 'mentorship'>('forum')
  const [searchQuery, setSearchQuery] = useState('')

  const forumThreads: ForumThread[] = [
    {
      id: '1',
      title: 'Best practices for validator node setup',
      author: 'NodeMaster',
      authorBadge: 'Diamond',
      category: 'Technical',
      replies: 23,
      likes: 45,
      lastActivity: '2 hours ago',
      isPinned: true,
    },
    {
      id: '2',
      title: 'Governance proposal: Increasing validator rewards',
      author: 'GovExpert',
      authorBadge: 'Gold',
      category: 'Governance',
      replies: 67,
      likes: 89,
      lastActivity: '1 hour ago',
      isHot: true,
    },
    {
      id: '3',
      title: 'Welcome to new contributors!',
      author: 'CommunityManager',
      authorBadge: 'Silver',
      category: 'General',
      replies: 12,
      likes: 34,
      lastActivity: '4 hours ago',
    },
    {
      id: '4',
      title: 'Tokenomics discussion: Long-term sustainability',
      author: 'TokenGuru',
      authorBadge: 'Gold',
      category: 'Economics',
      replies: 45,
      likes: 67,
      lastActivity: '6 hours ago',
    },
  ]

  const mentorshipRequests: MentorshipRequest[] = [
    {
      id: '1',
      mentee: 'NewDev2024',
      menteeBadge: 'Bronze',
      skill: 'Smart Contract Development',
      description: 'Looking for guidance on writing secure Solana programs',
      status: 'open',
    },
    {
      id: '2',
      mentee: 'ValidatorNewbie',
      menteeBadge: 'Bronze',
      skill: 'Node Operations',
      description: 'Need help setting up and maintaining validator infrastructure',
      status: 'matched',
    },
    {
      id: '3',
      mentee: 'GovLearner',
      menteeBadge: 'Silver',
      skill: 'Governance Participation',
      description: 'Want to learn how to effectively participate in NeuroSwarm governance',
      status: 'completed',
    },
  ]

  const filteredThreads = forumThreads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredMentorship = mentorshipRequests.filter(request =>
    request.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const badgeColors: Record<string, string> = {
    Bronze: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    Silver: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    Gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Diamond: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Brain className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Community Hub
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect, learn, and collaborate with the NeuroSwarm community
          </p>
        </div>

        {/* Search and Tabs */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions, mentorship opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </button>
          </div>

          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('forum')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'forum'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Forum
            </button>
            <button
              onClick={() => setActiveTab('mentorship')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'mentorship'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Mentorship
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'forum' ? (
          <div className="space-y-4">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow ${
                  thread.isPinned ? 'border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                        {thread.title}
                      </h3>
                      {thread.isPinned && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Pinned
                        </span>
                      )}
                      {thread.isHot && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Hot
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-medium">{thread.author}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs ${badgeColors[thread.authorBadge]}`}>
                        {thread.authorBadge}
                      </span>
                      <span className="ml-2">in {thread.category}</span>
                      <span className="mx-2">•</span>
                      <span>{thread.lastActivity}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Reply className="h-4 w-4 mr-1" />
                      {thread.replies}
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-4 w-4 mr-1" />
                      {thread.likes}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMentorship.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                        {request.skill}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${badgeColors[request.menteeBadge]}`}>
                        {request.menteeBadge}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {request.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{request.mentee}</span>
                      <span className="mx-2">•</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'open'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : request.status === 'matched'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  {request.status === 'open' && (
                    <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Mentor
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Community Stats */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Community Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">1,247</div>
              <div className="text-white/80">Active Contributors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">3,891</div>
              <div className="text-white/80">Forum Posts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">156</div>
              <div className="text-white/80">Mentorship Pairs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
