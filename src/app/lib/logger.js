import UserActivity from "@/models/UserActivity";
import { connectToDatabase } from "./mongodb";

class UserActivityLogger {
  constructor() {
    this.dbConnected = false;
  }

  // Ensure database connection
  async ensureConnection() {
    if (!this.dbConnected) {
      try {
        await connectToDatabase();
        this.dbConnected = true;
      } catch (error) {
        console.error("Failed to connect to database for logging:", error);
        return false;
      }
    }
    return true;
  }

  // Log user activity
  async logActivity(
    userId,
    userEmail,
    activity,
    description = "",
    metadata = {},
    req = null
  ) {
    try {
      // Ensure database connection
      if (!(await this.ensureConnection())) {
        return null;
      }

      const activityData = {
        userId,
        userEmail,
        activity,
        description,
        metadata,
        timestamp: new Date(),
      };

      // Add request-based data if available
      if (req) {
        activityData.ipAddress = this.getClientIP(req);
        activityData.userAgent = req.headers.get("user-agent") || "";
        // You might want to add session tracking here
      }

      return await UserActivity.logActivity(activityData);
    } catch (error) {
      console.error("Error in logActivity:", error);
      return null;
    }
  }

  // Get client IP address
  getClientIP(req) {
    if (!req) return "";

    // Check for forwarded IP
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    // Check for real IP
    const realIP = req.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    // Check for CF connecting IP
    const cfIP = req.headers.get("cf-connecting-ip");
    if (cfIP) {
      return cfIP;
    }

    // Fallback to remote address
    return req.socket?.remoteAddress || "";
  }

  // Convenience methods for common activities
  async logLogin(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "login",
      "User logged in",
      {},
      req
    );
  }

  async logLogout(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "logout",
      "User logged out",
      {},
      req
    );
  }

  async logSignup(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "signup",
      "User signed up",
      {},
      req
    );
  }

  async logEmailVerification(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "email_verification",
      "Email verified",
      {},
      req
    );
  }

  async logPasswordResetRequest(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "password_reset_request",
      "Password reset requested",
      {},
      req
    );
  }

  async logPasswordReset(userId, userEmail, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "password_reset",
      "Password reset completed",
      {},
      req
    );
  }

  async logProfileUpdate(userId, userEmail, changes = {}, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "profile_update",
      "Profile updated",
      { changes },
      req
    );
  }

  async logCourseEnrolled(
    userId,
    userEmail,
    courseId,
    courseTitle,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "course_enrolled",
      `Enrolled in course: ${courseTitle}`,
      { courseId, courseTitle },
      req
    );
  }

  async logCourseCompleted(
    userId,
    userEmail,
    courseId,
    courseTitle,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "course_completed",
      `Completed course: ${courseTitle}`,
      { courseId, courseTitle },
      req
    );
  }

  async logCourseBookmarked(
    userId,
    userEmail,
    courseId,
    courseTitle,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "course_bookmarked",
      `Bookmarked course: ${courseTitle}`,
      { courseId, courseTitle },
      req
    );
  }

  async logCourseUnbookmarked(
    userId,
    userEmail,
    courseId,
    courseTitle,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "course_unbookmarked",
      `Unbookmarked course: ${courseTitle}`,
      { courseId, courseTitle },
      req
    );
  }

  async logQuestionCreated(userId, userEmail, questionId, title, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "question_created",
      `Created question set: ${title}`,
      { questionId, title },
      req
    );
  }

  async logQuestionDeleted(userId, userEmail, questionId, title, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "question_deleted",
      `Deleted question set: ${title}`,
      { questionId, title },
      req
    );
  }

  async logQuestionBookmarked(
    userId,
    userEmail,
    questionId,
    title,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "question_bookmarked",
      `Bookmarked question set: ${title}`,
      { questionId, title },
      req
    );
  }

  async logQuestionUnbookmarked(
    userId,
    userEmail,
    questionId,
    title,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "question_unbookmarked",
      `Unbookmarked question set: ${title}`,
      { questionId, title },
      req
    );
  }

  async logSubscriptionCreated(userId, userEmail, plan, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "subscription_created",
      `Subscription created: ${plan}`,
      { plan },
      req
    );
  }

  async logSubscriptionUpdated(userId, userEmail, plan, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "subscription_updated",
      `Subscription updated: ${plan}`,
      { plan },
      req
    );
  }

  async logSubscriptionCanceled(userId, userEmail, plan, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "subscription_canceled",
      `Subscription canceled: ${plan}`,
      { plan },
      req
    );
  }

  async logPaymentSuccess(
    userId,
    userEmail,
    amount,
    currency,
    description,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "payment_success",
      `Payment successful: ${amount} ${currency}`,
      { amount, currency, description },
      req
    );
  }

  async logPaymentFailed(
    userId,
    userEmail,
    amount,
    currency,
    reason,
    req = null
  ) {
    return this.logActivity(
      userId,
      userEmail,
      "payment_failed",
      `Payment failed: ${amount} ${currency}`,
      { amount, currency, reason },
      req
    );
  }

  async logError(userId, userEmail, error, context, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "error",
      `Error occurred: ${error.message || error}`,
      { error: error.message || error, context },
      req
    );
  }

  async logPageView(userId, userEmail, page, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "page_view",
      `Viewed page: ${page}`,
      { page },
      req
    );
  }

  async logApiCall(userId, userEmail, endpoint, method, req = null) {
    return this.logActivity(
      userId,
      userEmail,
      "api_call",
      `API call: ${method} ${endpoint}`,
      { endpoint, method },
      req
    );
  }
}

// Export singleton instance
const logger = new UserActivityLogger();

export default logger;
