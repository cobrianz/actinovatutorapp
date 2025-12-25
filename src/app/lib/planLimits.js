// src/app/lib/planLimits.js
// Centralized plan limits and enforcement

/**
 * Get user's current plan limits
 * @param {Object} user - User object with subscription info
 * @returns {Object} Plan limits
 */
export function getUserPlanLimits(user) {
    if (!user) {
        return getBasicLimits();
    }

    const subscription = user.subscription;
    const isPremium = user.isPremium || (subscription?.plan === 'pro' && subscription?.status === 'active');
    const isEnterprise = subscription?.plan === 'enterprise' && subscription?.status === 'active';

    if (isEnterprise) {
        return getEnterpriseLimits();
    }

    if (isPremium) {
        return getPremiumLimits();
    }

    return getBasicLimits();
}

/**
 * Check if user has reached their limit for a specific feature
 * @param {Object} user - User object
 * @param {string} feature - Feature name (courses, quizzes, flashcards)
 * @param {number} currentUsage - Current usage count
 * @returns {Object} { allowed: boolean, limit: number, remaining: number }
 */
export function checkLimit(user, feature, currentUsage) {
    const limits = getUserPlanLimits(user);
    const limit = limits[feature];

    // -1 means unlimited
    if (limit === -1) {
        return {
            allowed: true,
            limit: -1,
            remaining: -1,
            isUnlimited: true,
        };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage < limit;

    return {
        allowed,
        limit,
        remaining,
        isUnlimited: false,
    };
}

/**
 * Get plan name from user
 * @param {Object} user - User object
 * @returns {string} Plan name
 */
export function getUserPlanName(user) {
    if (!user) return 'Basic';

    const subscription = user.subscription;
    const isEnterprise = subscription?.plan === 'enterprise' && subscription?.status === 'active';
    const isPremium = user.isPremium || (subscription?.plan === 'pro' && subscription?.status === 'active');

    if (isEnterprise) return 'Enterprise';
    if (isPremium) return 'Premium';
    return 'Basic';
}

// Plan limit definitions
function getBasicLimits() {
    return {
        courses: 2,
        quizzes: 1,
        flashcards: 8,
        modules: 3,
        lessonsPerModule: 3,
        totalLessons: 9,
        difficulties: ['beginner'],
        aiResponses: 3, // per day
    };
}

function getPremiumLimits() {
    return {
        courses: 15,
        quizzes: 20,
        flashcards: 40,
        modules: 20,
        lessonsPerModule: 5,
        totalLessons: 100,
        difficulties: ['beginner', 'intermediate', 'advanced'],
        aiResponses: -1, // unlimited
    };
}

function getEnterpriseLimits() {
    return {
        courses: -1, // unlimited
        quizzes: -1, // unlimited
        flashcards: -1, // unlimited
        modules: 20, // Match Premium structure cap for generation
        lessonsPerModule: 5, // Match Premium
        totalLessons: 100, // Match Premium
        difficulties: ['beginner', 'intermediate', 'advanced'],
        aiResponses: -1, // unlimited
    };
}

/**
 * Format limit for display
 * @param {number} limit - Limit value (-1 for unlimited)
 * @returns {string} Formatted limit
 */
export function formatLimit(limit) {
    return limit === -1 ? 'Unlimited' : limit.toString();
}

/**
 * Check if user can access difficulty level
 * @param {Object} user - User object
 * @param {string} difficulty - Difficulty level
 * @returns {boolean} Can access
 */
export function canAccessDifficulty(user, difficulty) {
    const limits = getUserPlanLimits(user);
    return limits.difficulties.includes(difficulty.toLowerCase());
}
