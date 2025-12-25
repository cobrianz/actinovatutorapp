/**
 * Subscription Plan Limits for Actinova AI Tutor
 * Centralized configuration for Free, Premium (Pro), and Enterprise plans
 */

export const PLAN_LIMITS = {
    free: {
        courses: 3,
        flashcards: 5,
        quizzes: 3,
        aiResponses: 3, // per day
        modules: 3,
        lessonsPerModule: 3,
        totalLessons: 9,
        cards: 8,
        monthlyGenerations: 3,
    },
    premium: {
        courses: 50,
        flashcards: 100,
        quizzes: 50,
        aiResponses: -1, // unlimited
        modules: 20,
        lessonsPerModule: 5,
        totalLessons: 100,
        cards: 40,
        monthlyGenerations: 50,
    },
    enterprise: {
        courses: -1, // unlimited
        flashcards: -1,
        quizzes: -1,
        aiResponses: -1,
        modules: 30,
        lessonsPerModule: 8,
        totalLessons: 240,
        cards: 100,
        monthlyGenerations: -1,
    },
};

/**
 * Get the plan name for a user
 * @param {Object} user - User object from database
 * @returns {string} - 'free', 'premium', or 'enterprise'
 */
export function getUserPlanName(user) {
    if (!user) return 'free';

    const hasActiveSubscription = user.subscription?.status === 'active';
    const plan = user.subscription?.plan;

    if (hasActiveSubscription && plan === 'enterprise') return 'enterprise';
    if (hasActiveSubscription && plan === 'pro') return 'premium';
    if (user.isPremium) return 'premium';

    return 'free';
}

/**
 * Get plan limits for a user
 * @param {Object} user - User object from database
 * @returns {Object} - Plan limits object
 */
export function getUserPlanLimits(user) {
    const planName = getUserPlanName(user);
    return PLAN_LIMITS[planName] || PLAN_LIMITS.free;
}

/**
 * Check if user has reached a specific limit
 * @param {Object} user - User object from database
 * @param {string} resource - Resource type ('courses', 'flashcards', 'quizzes', 'aiResponses')
 * @param {number} currentUsage - Current usage count
 * @returns {Object} - { allowed: boolean, limit: number, remaining: number }
 */
export function checkLimit(user, resource, currentUsage) {
    const limits = getUserPlanLimits(user);
    const limit = limits[resource];

    // -1 means unlimited
    if (limit === -1) {
        return {
            allowed: true,
            limit: -1,
            remaining: -1,
        };
    }

    const allowed = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage);

    return {
        allowed,
        limit,
        remaining,
    };
}

/**
 * Check if a feature is available for a user's plan
 * @param {Object} user - User object from database
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export function hasFeature(user, feature) {
    const planName = getUserPlanName(user);

    const features = {
        free: ['basic_courses', 'limited_flashcards', 'limited_quizzes'],
        premium: ['unlimited_ai', 'pdf_download', 'delete_courses', 'advanced_difficulty', 'priority_support'],
        enterprise: ['unlimited_everything', 'api_access', 'custom_branding', 'dedicated_support'],
    };

    return features[planName]?.includes(feature) || false;
}
