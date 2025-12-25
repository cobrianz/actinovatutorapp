"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
// D3 visualizations removed per policy
import { downloadCourseAsPDF } from "@/lib/pdfUtils";
import {
  Download,
  Eye,
  Trash2,
  Plus,
  BookOpen,
  X,
  Clock,
  Book,
  Target,
  Layers,
  Users,
  Sparkles,
  BarChart3,
  Network,
  PieChart,
} from "lucide-react";

export default function Guides({ setActiveContent }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [showVisualization, setShowVisualization] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      const response = await fetch("/api/guides");
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides || []);
      } else {
        toast.error("Failed to load guides");
      }
    } catch (error) {
      console.error("Error fetching guides:", error);
      toast.error("Error loading guides");
    } finally {
      setLoading(false);
    }
  };

  const VisualizationModal = () => {
    // Visualization modal removed per policy
    return null;
  };
        key: "sunburst",
        icon: <Sparkles className="w-4 h-4" />,
        label: "Sunburst",
        color: "from-indigo-500 to-purple-500",
      },
    ];

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/20 to-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/30 dark:border-gray-700/50">
          {/* Enhanced Header */}
          <div className="p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/60 via-indigo-50/60 to-purple-50/60 dark:from-gray-800/50 dark:via-gray-900/50 dark:to-gray-800/50">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Eye className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                    {guide.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Interactive Data Visualization Dashboard
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Book className="w-4 h-4" />
                      <span>{guide.modules.length} modules</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="capitalize">{guide.level} level</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="group relative p-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white/95 dark:hover:bg-gray-700/80 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/40 dark:border-gray-700/40 hover:scale-105"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Enhanced Visualization Type Selector */}
            <div className="flex flex-wrap gap-3 mt-8 bg-white/60 dark:bg-gray-800/60 rounded-2xl p-4 backdrop-blur-sm border border-white/40 dark:border-gray-700/40">
              {visualizationTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setVizType(type.key)}
                  className={`
                    group relative flex items-center space-x-3 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-300
                    shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform border backdrop-blur-sm
                    ${
                      vizType === type.key
                        ? `bg-gradient-to-r ${type.color} text-white shadow-lg scale-105`
                        : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 border-gray-200/50 dark:border-gray-600/50"
                    }
                  `}
                >
                  <div
                    className={
                      vizType === type.key
                        ? "text-white"
                        : `text-${type.color.split("-")[1]}-500`
                    }
                  >
                    {type.icon}
                  </div>
                  <span>{type.label}</span>
                  {vizType === type.key && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Visualization Content */}
          <div className="p-8 overflow-auto max-h-[calc(95vh-280px)] bg-gradient-to-br from-gray-50/30 to-white/30 dark:from-gray-900/20 dark:to-gray-800/20">
            <div className="h-full w-full bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/50 dark:to-gray-800/50 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
              <VizComponent data={vizData} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-indigo-50/50 to-purple-50/50 dark:from-gray-900/30 dark:via-gray-800/30 dark:to-gray-900/30 rounded-3xl p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200/50 dark:border-blue-800/50 border-t-4 border-t-blue-600 rounded-full animate-spin"></div>
            <BookOpen className="absolute inset-0 m-auto w-24 h-24 text-blue-600/20" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              Loading your guides...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
              We're preparing your personalized learning materials with
              beautiful visualizations
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/30 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-950">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-12">
          <div className="mb-8 lg:mb-0">
            <div className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white text-sm font-semibold mb-6 shadow-xl">
              <BookOpen className="w-4 h-4 mr-2" />
              Your Learning Guides
            </div>
            <h1 className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-200 dark:to-indigo-300 leading-tight mb-4">
              Knowledge
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Visualized
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Transform your learning journey with interactive visualizations
              and structured guides. Explore, analyze, and master complex topics
              through beautiful data representations.
            </p>
          </div>
          <button
            onClick={() => setActiveContent("generate")}
            className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl hover:-translate-y-1 transform transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            <Plus className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform z-10" />
            <span className="z-10">Create New Guide</span>
            <div className="absolute inset-0 bg-white/10 rounded-2xl transform scale-0 group-hover:scale-100 transition-transform duration-500"></div>
          </button>
        </div>

        {/* Empty State */}
        {guides.length === 0 ? (
          <div className="relative">
            <div className="max-w-4xl mx-auto text-center py-20 px-8">
              <div className="relative mx-auto w-56 h-56 mb-10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50 dark:border-gray-700/50">
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl mb-6 inline-block">
                    <BookOpen className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    No guides yet
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Start your visual learning journey by creating your first
                    interactive guide. Transform any topic into an engaging,
                    structured learning experience with beautiful
                    visualizations.
                  </p>
                  <button
                    onClick={() => setActiveContent("generate")}
                    className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transform transition-all duration-500"
                  >
                    <Plus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                    <span>Create Your First Guide</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Enhanced Guides Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {guides.map((guide, index) => (
              <div
                key={guide._id}
                className={`
                  group relative bg-white/80 dark:bg-gray-900/80 
                  backdrop-blur-xl rounded-3xl p-8 shadow-2xl hover:shadow-3xl 
                  border border-white/60 dark:border-gray-700/60
                  transition-all duration-500 hover:-translate-y-2
                  overflow-hidden
                  ${index % 4 === 0 ? "hover:border-blue-400/40" : ""}
                  ${index % 4 === 1 ? "hover:border-indigo-400/40" : ""}
                  ${index % 4 === 2 ? "hover:border-purple-400/40" : ""}
                  ${index % 4 === 3 ? "hover:border-emerald-400/40" : ""}
                `}
              >
                {/* Animated background */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    index % 4 === 0
                      ? "bg-gradient-to-br from-blue-500/5 to-cyan-500/5"
                      : index % 4 === 1
                        ? "bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
                        : index % 4 === 2
                          ? "bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                          : "bg-gradient-to-br from-emerald-500/5 to-teal-500/5"
                  }`}
                />

                {/* Enhanced Badge */}
                <div className="absolute top-6 right-6">
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl border border-blue-500/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                    <Layers className="w-3 h-3 mr-2" />
                    Interactive Guide
                  </div>
                </div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2 text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors pr-4">
                    {guide.title}
                  </h3>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 relative">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl backdrop-blur-sm border border-blue-200/40 group-hover:border-blue-300/60 transition-colors">
                    <div className="p-2 bg-blue-100/60 dark:bg-blue-900/40 rounded-xl">
                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Topic
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
                        {guide.topic}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl backdrop-blur-sm border border-emerald-200/40 group-hover:border-emerald-300/60 transition-colors">
                    <div className="p-2 bg-emerald-100/60 dark:bg-emerald-900/40 rounded-xl">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Level
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                        {guide.level}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-purple-50/60 to-violet-50/60 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl backdrop-blur-sm border border-purple-200/40 group-hover:border-purple-300/60 transition-colors">
                    <div className="p-2 bg-purple-100/60 dark:bg-purple-900/40 rounded-xl">
                      <Book className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Modules
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {guide.modules.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/60 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl backdrop-blur-sm border border-amber-200/40 group-hover:border-amber-300/60 transition-colors">
                    <div className="p-2 bg-amber-100/60 dark:bg-amber-900/40 rounded-xl">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        Lessons
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {guide.modules.reduce(
                          (total, module) => total + module.lessons.length,
                          0
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex items-center justify-between mb-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                  <div className="flex items-center space-x-3">
                    {/* Visualization action removed */}
                    <button
                      onClick={() => downloadGuideAsPDF(guide)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                  <button
                    onClick={() => deleteGuide(guide._id)}
                    className="p-2.5 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-2xl text-red-600 dark:text-red-400 hover:from-red-500/20 hover:to-rose-500/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-300 hover:scale-110 shadow-sm hover:shadow-md border border-red-200/50 backdrop-blur-sm"
                    title="Delete Guide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Enhanced Mini Visualization */}
                {/* Mini visualization removed. Consider static image or link. */}

                {/* Enhanced Footer */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center space-x-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(guide.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs bg-gradient-to-r from-green-50/60 to-emerald-50/60 dark:from-green-900/20 dark:to-emerald-900/20 px-4 py-2 rounded-2xl border border-green-200/50">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-700 dark:text-green-300 font-semibold">
                      Ready to Study
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Visualization Modal */}
        {/* Visualization modal removed */}
      </div>
    </div>
  );
}
