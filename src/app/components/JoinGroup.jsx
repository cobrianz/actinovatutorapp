"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Users, Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function JoinGroup({ group, isOpen, onClose, onJoin }) {
  const [isJoining, setIsJoining] = useState(false)
  const [joinReason, setJoinReason] = useState("")

  const handleJoin = async () => {
    setIsJoining(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    onJoin(group.id)
    setIsJoining(false)
    toast.success(`Successfully joined ${group.name}!`)
    onClose()
  }

  if (!group) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              <img
                src={group.image || "/placeholder.svg"}
                alt={group.name}
                className="w-full h-48 object-cover rounded-t-2xl"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-black/70 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-2xl font-bold text-white mb-2">{group.name}</h2>
                <div className="flex items-center space-x-4 text-white/90 text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{group.members} members</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      group.difficulty === "Beginner"
                        ? "bg-green-500/80"
                        : group.difficulty === "Intermediate"
                          ? "bg-yellow-500/80"
                          : "bg-red-500/80"
                    }`}
                  >
                    {group.difficulty}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About this group</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{group.description}</p>
              </div>

              {/* Group Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Next Meeting</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{group.nextMeeting}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Meeting Duration</p>
                      <p className="font-semibold text-gray-900 dark:text-white">1-2 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Topics covered</h4>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Group Rules */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Group Guidelines</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <ul className="space-y-1">
                        <li>• Attend meetings regularly and participate actively</li>
                        <li>• Be respectful and supportive of other members</li>
                        <li>• Come prepared with questions or topics to discuss</li>
                        <li>• Share resources and help others when possible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Join Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Why do you want to join this group? (Optional)
                </label>
                <textarea
                  value={joinReason}
                  onChange={(e) => setJoinReason(e.target.value)}
                  placeholder="Tell the group organizer about your goals and what you hope to contribute..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Benefits */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">What you'll get</h4>
                <div className="space-y-2">
                  {[
                    "Weekly live study sessions",
                    "Access to exclusive resources and materials",
                    "Peer support and networking opportunities",
                    "Progress tracking and accountability",
                    "Certificate upon completion",
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isJoining ? "Joining..." : "Join Group"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
