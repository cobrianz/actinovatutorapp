"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  X,
  Sun,
  Moon,
  Menu,
  XIcon,
  CreditCard,
  Calendar,
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Bell,
  Shield,
  Palette,
  Globe,
  BookOpen,
  Clock,
  Target,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Settings as SettingsIcon,
  ChevronRight,
  Crown,
  Star,
  Zap,
  Receipt,
  LogOut,
  TrendingUp,
  Target as TargetIcon,
  LifeBuoy
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { toast } from "sonner";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";
import dynamic from "next/dynamic";

const BillingHistory = dynamic(() => import("./BillingHistory"), { ssr: false });

const defaultSettings = {
  difficulty: "adaptive",
  studyGoal: "balanced",
  sessionLength: 25,
  breakLength: 5,
};

export default function ProfileContent() {
  const router = useRouter();
  const { user, refreshToken, logout } = useAuth();
  const { theme, setThemePreference } = useTheme();
  const [activeTab, setActiveTab] = useState("my-profile");
  const tabContentRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [editData, setEditData] = useState({ firstName: "", lastName: "" });
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [userData, setUserData] = useState(null);
  const [settings, setSettings] = useState({
    ...defaultSettings,
    emailNotifications: true,
  });
  const [contactForm, setContactForm] = useState({
    subject: "",
    category: "general",
    message: "",
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);


  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (profileData?.user?.settings) {
      const { preferences, notifications } = profileData.user.settings;
      setSettings((prev) => ({
        ...prev,
        difficulty: preferences?.difficulty || defaultSettings.difficulty,
        // studyGoal: preferences?.studyGoal || defaultSettings.studyGoal, 
        sessionLength: preferences?.dailyGoal || defaultSettings.sessionLength,
        theme: preferences?.theme || "system",
        language: preferences?.language || "en",

        emailNotifications: notifications?.email ?? true,
        marketingEmails: notifications?.marketing ?? true,
        studyReminders: notifications?.courseUpdates ?? true,
      }));
    }
  }, [profileData]);

  useEffect(() => {
    if (activeTab && tabContentRef.current) {
      tabContentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setLoading(true);
      const response = await authenticatedFetch("/api/profile");

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);

      const formData = new FormData();
      formData.append("firstName", editData.firstName);
      formData.append("lastName", editData.lastName);
      // bio and location removed from profile updates

      const response = await authenticatedFetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setShowUserInfoModal(false);
        toast.success("Profile updated successfully!");
        // Refresh user data in auth context
        await refreshToken();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to update profile");
        toast.error(errorData.error || "Failed to update profile");
      }
    } catch (err) {
      setError("Failed to update profile");
      toast.error("Failed to update profile");
      console.error("Profile update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getPasswordErrors = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push("Must be at least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("Must contain an uppercase letter");
    if (!/[a-z]/.test(pwd)) errors.push("Must contain a lowercase letter");
    if (!/[0-9]/.test(pwd)) errors.push("Must contain a number");
    if (!/[@$!%*?&]/.test(pwd))
      errors.push("Must contain a special character (@$!%*?&)");
    if (pwd.toLowerCase().includes("password"))
      errors.push("Cannot contain the word 'password'");
    return errors;
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setPasswordErrors(["Passwords do not match"]);
      toast.error("Passwords do not match");
      return;
    }

    const clientErrors = getPasswordErrors(passwordData.new);
    if (clientErrors.length) {
      setPasswordErrors(clientErrors);
      toast.error(clientErrors.join("; "));
      return;
    }

    try {
      setUpdating(true);

      const response = await authenticatedFetch("/api/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new,
          confirmPassword: passwordData.confirm,
        }),
      });

      if (response.ok) {
        setPasswordData({ current: "", new: "", confirm: "" });
        setPasswordErrors([]);
        toast.success("Password changed successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        const serverDetails = Array.isArray(errorData?.details)
          ? errorData.details.map((d) => d.message).filter(Boolean)
          : [];
        const messages = serverDetails.length
          ? serverDetails
          : [errorData.error || "Failed to change password"];
        setPasswordErrors(messages);
        toast.error(messages.join("; "));
      }
    } catch (err) {
      toast.error("Failed to change password");
      console.error("Password change error:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      // No need to manually fetch logout here, useAuth().logout() handles it
      // await authenticatedFetch("/api/logout", { method: "POST" });
      logout();
      toast.success("Successfully logged out");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      logout();
      router.push("/");
    }
  };


  const handleSaveUserInfo = () => {
    setUserData(editData);
    setShowUserInfoModal(false);
  };

  const tabItems = [
    { id: "my-profile", label: "Overview", icon: User },
    { id: "password", label: "Security", icon: Shield },
    { id: "settings", label: "Preferences", icon: SettingsIcon },
    { id: "billing", label: "Billing & Plan", icon: CreditCard },
    { id: "support", label: "Contact Support", icon: LifeBuoy },
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    try {
      setIsSubmittingContact(true);
      const response = await authenticatedFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.name,
          email: user?.email,
          ...contactForm
        }),
      });

      if (response.ok) {
        toast.success("Message sent successfully! We'll get back to you soon.");
        setContactForm({ subject: "", category: "general", message: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Contact error:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setUpdating(true);
      const payload = {
        notifications: {
          email: !!settings.emailNotifications,
          marketing: !!settings.marketingEmails,
          courseUpdates: !!settings.studyReminders,
          push: false,
        },
        preferences: {
          theme: settings.theme || "system",
          language: settings.language || "en",
          difficulty: settings.difficulty || "adaptive",
          dailyGoal: Number(settings.sessionLength) || 25,
        },
        privacy: {
          profileVisible: true,
          progressVisible: false,
          achievementsVisible: false,
        },
      };

      const response = await authenticatedFetch("/api/settings/update", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Settings saved successfully");
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to save settings");
      }
    } catch (e) {
      console.error("Save settings error:", e);
      toast.error("Failed to save settings");
    } finally {
      setUpdating(false);
    }
  };

  const ModalOverlay = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ">
        <div
          className={`${theme === 'dark' ? "bg-slate-500 border-slate-800" : "bg-white border-slate-200"} border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto`}
        >
          <div
            className={`sticky top-0 flex items-center justify-between p-6 border-b ${theme === 'dark' ? "border-slate-800" : "border-slate-200"} ${theme === 'dark' ? "bg-slate-900" : "bg-white"}`}
          >
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen pb-24 ${theme === 'dark' ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* User Stats Card - Mobile First */}
        <div className={`p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-indigo-500/20 ${theme === 'dark' ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100"}`}>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center p-1 transform rotate-3 transition-transform hover:rotate-0 ${theme === 'dark' ? "bg-indigo-900/40" : "bg-indigo-50"}`}>
              <div className={`w-full h-full rounded-[1.8rem] flex items-center justify-center text-white text-3xl font-black bg-gradient-to-br from-indigo-600 to-purple-600 overflow-hidden`}>
                {profileData?.usage?.isPremium && user?.image ? (
                  <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : profileData?.usage?.isPremium ? (
                  <Crown size={36} className="text-white drop-shadow-lg" />
                ) : (
                  <User size={36} className="text-white" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-black mb-1">
              {profileData?.user?.firstName ? `${profileData.user.firstName} ${profileData.user.lastName}` : (user?.name || "Actinova User")}
            </h1>
            <p className="text-sm text-gray-500 mb-4">{profileData?.user?.email || user?.email}</p>

            <div className="flex gap-2">
              <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${profileData?.usage?.isPremium
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                {profileData?.usage?.isPremium ? <Crown size={12} /> : <Star size={12} />}
                {profileData?.usage?.isPremium ? "Pro Member" : "Free Explorer"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="text-xl font-black">{profileData?.usage?.details?.courses?.used || 0}</div>
              <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">{profileData?.usage?.details?.flashcards?.used || 0}</div>
              <div className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Cards</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Mobile Styled */}
        <div className="space-y-3 mt-10">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${isActive
                  ? "bg-indigo-600 text-white"
                  : theme === 'dark' ? "bg-gray-900 border border-gray-800 text-gray-300" : "bg-white border border-gray-100 text-gray-700"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-white/20" : theme === 'dark' ? "bg-gray-800" : "bg-gray-50"}`}>
                    <Icon size={20} className={isActive ? "text-white" : "text-indigo-600"} />
                  </div>
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </div>
                <ChevronRight size={18} className={isActive ? "text-white/50" : "text-gray-400"} />
              </button>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${theme === 'dark' ? "bg-red-900/10 border border-red-900/20 text-red-400" : "bg-red-50 border border-red-100 text-red-600"
              } mt-6`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? "bg-red-950/40" : "bg-red-100/50"}`}>
                <LogOut size={20} />
              </div>
              <span className="font-bold text-sm tracking-tight">Sign Out</span>
            </div>
            <ChevronRight size={18} className="opacity-40" />
          </button>
        </div>

        {/* Tab Detail Content */}
        <div 
          ref={tabContentRef}
          className={`mt-8 p-6 rounded-3xl scroll-mt-24 ${theme === 'dark' ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100"}`}
        >
          {activeTab === "my-profile" && (
            <div className="space-y-6">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4">Account Usage</h2>
              <div className="space-y-5">
                {[
                  { label: "Learning Courses", used: profileData?.usage?.details?.courses?.used, limit: profileData?.usage?.details?.courses?.limit, color: "bg-blue-500" },
                  { label: "Flashcards", used: profileData?.usage?.details?.flashcards?.used, limit: profileData?.usage?.details?.flashcards?.limit, color: "bg-purple-500" },
                  { label: "Assessments", used: profileData?.usage?.details?.quizzes?.used, limit: profileData?.usage?.details?.quizzes?.limit, color: "bg-emerald-500" }
                ].map((stat, i) => {
                  const percent = stat.limit ? (stat.used / stat.limit) * 100 : 100;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-500 uppercase">{stat.label}</span>
                        <span>{stat.used} / {stat.limit || "∞"}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50">
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-widest text-center">
                  Reset: {profileData?.usage?.resetDate || "1st of month"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-6">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4">Security</h2>
              <div className="space-y-4">
                {['current', 'new', 'confirm'].map((field) => (
                  <div key={field}>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">{field} Password</label>
                    <input
                      type="password"
                      value={passwordData[field]}
                      onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                      className={`w-full px-4 py-3 rounded-2xl border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                      placeholder="••••••••"
                    />
                  </div>
                ))}
                <button
                  onClick={handlePasswordChange}
                  disabled={updating}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  {updating ? "Updating..." : "Update Security"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-8">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4">Preferences</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">Learning Difficulty</label>
                  <select
                    value={settings.difficulty}
                    onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm ${theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">App Appearance</label>
                  <div className={`grid grid-cols-3 gap-2 p-1 rounded-2xl ${theme === 'dark' ? "bg-gray-800" : "bg-gray-100"}`}>
                    {['light', 'dark', 'system'].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setSettings({ ...settings, theme: t });
                          setThemePreference(t);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${settings.theme === t
                          ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl flex items-center justify-between ${theme === 'dark' ? "bg-gray-800" : "bg-gray-50"}`}>
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="w-6 h-6 rounded-lg accent-indigo-600"
                  />
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={updating}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="space-y-8">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4">Contact Support</h2>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">Category</label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm ${theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="technical">Technical Support</option>
                    <option value="billing">Billing Issue</option>
                    <option value="feature">Feature Request</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">Subject</label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="Brief summary of your inquiry"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 ml-1">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can we help you today?"
                    rows={5}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none ${theme === 'dark' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingContact ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-center">Subscription</h2>
              <div className={`p-8 rounded-3xl relative overflow-hidden bg-indigo-600 text-white mb-8`}>
                <div className="relative z-10 text-center">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest">Active Plan</span>
                  <h3 className="text-3xl font-black mt-4 uppercase">
                    {profileData?.usage?.isPremium ? "Pro Elite" : "Free Starter"}
                  </h3>
                  {!profileData?.usage?.isPremium && (
                    <button
                      onClick={() => router.push("/dashboard?tab=upgrade")}
                      className="mt-6 px-6 py-2.5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest"
                    >
                      Go Pro Now
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 ml-1">Billing History</h3>
                <BillingHistory
                  billingHistory={profileData?.user?.billingHistory}
                  theme={theme}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
