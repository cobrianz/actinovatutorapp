# Actinova AI Tutor Admin Dashboard Documentation

## Overview

The Actinova AI Tutor Admin Dashboard provides comprehensive management and analytics capabilities for the AI-powered learning platform. This document outlines the complete specification for developing an admin dashboard that enables administrators to monitor, manage, and analyze all aspects of the platform.

## Project Context

**Application**: Actinova AI Tutor
**Technology Stack**: Next.js 15, React 19, MongoDB, OpenAI GPT-4
**Target Users**: Platform administrators and content managers

## Design and Theming

### Theme Support
The admin dashboard supports light and dark themes with colored variants:
- **Light Theme**: Uses soft blue and purple gradients for backgrounds, with light gray accents
- **Dark Theme**: Uses deep blue and purple tones for backgrounds, with colored gray highlights
- **Glassy Effect**: All components use backdrop blur and semi-transparent backgrounds for a modern glassy appearance
- **No Box Shadows**: Components rely on borders and gradients instead of shadows for depth
- **Color Palette**:
  - Primary Blue: #3B82F6 to #1E40AF (light to dark)
  - Primary Purple: #8B5CF6 to #5B21B6 (light to dark)
  - Accent Gray: #F3F4F6 to #374151 (light to dark)

### UI Components
- **Charts**: At least 4 varied chart types per section (line, area, pie, donut, scatter, bar - no two bar charts in same section)
- **Tables**: Detailed data tables with sorting, filtering, pagination
- **Modals**: Comprehensive modals for details, editing, confirmation
- **Toasts**: Sonner toast notifications for all user actions (success, error, info)

## Core Entities and Data Models

### 1. User Management
**Model**: `User` (src/app/models/User.js)

**Key Fields**:
- Personal Information: firstName, lastName, email
- Authentication: password (hashed), emailVerified, status
- Subscription: plan, status, billing history
- Usage Tracking: monthlyUsage, courses enrolled
- Profile: avatar, bio, preferences, interests

**Admin Operations**:
- View all users with filtering and search
- Edit user profiles and permissions
- Manage subscriptions and billing
- Reset passwords and unlock accounts
- View user activity logs

### 2. Course Management
**Model**: `Course` (src/app/models/Course.js)

**Key Fields**:
- Content: title, level, totalModules, totalLessons
- Structure: modules (with lessons)
- Metadata: createdBy, timestamps

**Admin Operations**:
- View all generated courses
- Edit course content and metadata
- Delete inappropriate content
- Monitor course popularity and usage
- Generate system-wide course statistics

### 3. Quiz Management
**Model**: `Test` (src/models/Quiz.js)

**Key Fields**:
- Content: title, course, questions
- Performance: performances array with user scores
- Questions: text, type, options, correctAnswer

**Admin Operations**:
- View all quizzes and their performance
- Edit quiz content
- Monitor quiz completion rates
- Analyze question difficulty

### 4. Flashcard Management
**Model**: `Guide` (src/app/models/Guide.js) - Contains flashcard data

**Key Fields**:
- Content: title, topic, level, modules with cards
- Cards: front/back content

**Admin Operations**:
- View flashcard sets and usage
- Edit flashcard content
- Monitor study patterns

### 5. Content Management (Blog/Posts)
**Model**: `Post` (src/app/models/Post.js)

**Key Fields**:
- Content: title, content, summary, tags
- Engagement: likesCount, bookmarksCount, commentsCount
- Author: author information
- Status: published/draft, featured

**Admin Operations**:
- Create and edit blog posts
- Manage comments and user interactions
- Moderate content
- Analyze content performance

### 6. User Activity Tracking
**Model**: `UserActivity` (src/app/models/UserActivity.js)

**Key Fields**:
- Activity: login, course_generation, payment, etc.
- Metadata: IP, userAgent, session info
- Timestamps and user references

**Admin Operations**:
- Monitor user engagement
- Track platform usage patterns
- Identify popular features
- Detect unusual activity

### 7. Contact Management
**Model**: `Contact` (src/app/models/Contact.js)

**Key Fields**:
- Contact Info: name, email, subject, message
- Status: new, responded, closed
- Timestamps: createdAt, respondedAt

**Admin Operations**:
- View and manage contact submissions
- Respond to inquiries
- Track response times
- Categorize contacts

### 8. Admin User Management
**Model**: `Admin` (src/app/models/Admin.js)

**Key Fields**:
- Personal Information: firstName, lastName, email
- Authentication: password (hashed), emailVerified, status
- Security: twoSecretKeys (array of 2 hashed keys), lastLogin, loginAttempts
- Permissions: role, accessLevel
- Activity: actionLogs, createdAt, updatedAt

**Admin Operations**:
- Admin signup with 2 secret keys verification
- Email verification for admin accounts
- Login with rate limiting
- Forgot password with secure reset
- Profile management
- Activity monitoring

## Admin Dashboard Features

### 1. Dashboard Overview

#### Key Metrics Cards
- Total Users (active/inactive breakdown)
- Total Courses Generated
- Total Revenue (monthly/yearly)
- Active Subscriptions
- Daily/Monthly Active Users
- Course Completion Rate
- Average Session Duration

#### Charts (4 minimum, varied types)
1. **User Growth Trend**: Line chart showing daily user registrations over time
2. **Revenue Distribution**: Pie chart breaking down revenue by subscription plans
3. **Activity Heatmap**: Area chart displaying daily active users by hour
4. **Course Completion Funnel**: Donut chart showing completion stages

#### Tables
- Recent User Registrations: columns - Name, Email, Registration Date, Status
- Top Performing Courses: columns - Title, Enrollments, Completion Rate, Average Rating

#### Modals
- Quick Stats Modal: Detailed breakdown of key metrics with export options
- Announcement Modal: Create and send system-wide announcements

#### Quick Actions (with Sonner toasts)
- Create new blog post (toast: "Blog post created successfully")
- Send system announcement (toast: "Announcement sent to all users")
- Export data (toast: "Data export initiated")
- Manage user reports (toast: "Report generated")

### 2. User Management Section

#### User List/Table
- Search and filter by: name, email, status, subscription, registration date
- Bulk actions: activate/deactivate, change subscription, export list
- User details modal with full profile information
- Activity timeline for each user

#### Charts (4 minimum, varied types)
1. **User Registration Trends**: Area chart showing monthly registrations
2. **Subscription Distribution**: Donut chart of users by plan type
3. **Geographic Distribution**: Pie chart of users by region
4. **User Retention Curve**: Line chart showing retention over time

#### Tables
- User Overview Table: columns - ID, Name, Email, Status, Subscription, Last Login, Actions
- User Activity Log: columns - Date, Action, IP Address, Details

#### Modals
- User Details Modal: Full profile view with edit capabilities
- Bulk Action Confirmation Modal: Confirm bulk operations
- Password Reset Modal: Admin-initiated password reset

#### Actions with Toasts
- Edit User: "User profile updated successfully"
- Delete User: "User account deleted"
- Reset Password: "Password reset email sent"
- Bulk Activate: "Selected users activated"

### 3. Course Management Section

#### Course Library
- Browse all generated courses
- Filter by: creator, difficulty, creation date, popularity
- Edit course metadata
- Delete inappropriate content
- View course usage statistics

#### Charts (4 minimum, varied types)
1. **Course Generation Trends**: Line chart of courses created over time
2. **Difficulty Distribution**: Pie chart of courses by difficulty level
3. **Enrollment Analytics**: Area chart showing course popularity
4. **Completion Rates**: Scatter plot of completion vs. difficulty

#### Tables
- Course Catalog: columns - Title, Creator, Difficulty, Modules, Enrollments, Rating, Status
- Course Performance: columns - Course, Total Students, Completions, Average Score, Feedback

#### Modals
- Course Details Modal: Full course structure and content preview
- Edit Course Modal: Modify metadata and content
- Delete Confirmation Modal: Confirm course deletion

#### Actions with Toasts
- Update Course: "Course updated successfully"
- Delete Course: "Course deleted"
- Publish Course: "Course published"
- Archive Course: "Course archived"

### 4. Flashcard Management Section

#### Flashcard Sets
- View all flashcard collections
- Filter by topic, difficulty, usage
- Edit flashcard content
- Monitor study patterns

#### Charts (4 minimum, varied types)
1. **Flashcard Creation Trends**: Area chart of new sets over time
2. **Topic Popularity**: Donut chart of most studied topics
3. **Study Session Duration**: Line chart of average study times
4. **Difficulty Progression**: Scatter plot of user performance by difficulty

#### Tables
- Flashcard Overview: columns - Title, Topic, Cards Count, Created By, Usage Count, Average Rating
- Study Analytics: columns - User, Set, Sessions, Time Spent, Completion Rate

#### Modals
- Flashcard Editor Modal: Add/edit cards in a set
- Preview Modal: View flashcard set as user would see it
- Usage Stats Modal: Detailed analytics for a set

#### Actions with Toasts
- Save Changes: "Flashcard set updated"
- Delete Set: "Flashcard set deleted"
- Duplicate Set: "Set duplicated successfully"
- Publish Set: "Set published"

### 5. Tests/Quiz Management Section

#### Quiz Library
- List all quizzes with performance metrics
- Edit quiz questions and answers
- View completion rates and average scores
- Identify difficult questions

#### Charts (4 minimum, varied types)
1. **Quiz Performance Distribution**: Scatter plot of scores vs. attempts
2. **Question Difficulty Heatmap**: Area chart of question failure rates
3. **Completion Trends**: Line chart of quiz completions over time
4. **Score Analytics**: Pie chart of score ranges

#### Tables
- Quiz List: columns - Title, Course, Questions, Attempts, Average Score, Pass Rate
- Question Analysis: columns - Question, Correct %, Difficulty, Feedback

#### Modals
- Quiz Builder Modal: Create/edit quiz structure
- Performance Details Modal: Individual quiz analytics
- Question Editor Modal: Modify questions and answers

#### Actions with Toasts
- Update Quiz: "Quiz updated successfully"
- Delete Quiz: "Quiz deleted"
- Publish Quiz: "Quiz published"
- Reset Scores: "Quiz scores reset"

### 6. Blogs Management Section

#### Blog Posts
- Create/edit/delete posts
- Manage comments and replies
- Feature/unfeature posts
- View engagement metrics

#### Charts (4 minimum, varied types)
1. **Post Engagement Trends**: Line chart of likes/comments over time
2. **Content Categories**: Donut chart of posts by category
3. **Publishing Frequency**: Area chart of posts per week
4. **Reader Demographics**: Pie chart of audience segments

#### Tables
- Posts Table: columns - Title, Author, Status, Views, Likes, Comments, Published Date
- Comments Table: columns - Post, User, Comment, Date, Status, Actions

#### Modals
- Post Editor Modal: Rich text editor for content creation
- Comment Moderation Modal: Review and moderate comments
- Analytics Modal: Detailed post performance

#### Actions with Toasts
- Publish Post: "Post published successfully"
- Delete Post: "Post deleted"
- Feature Post: "Post featured"
- Moderate Comment: "Comment moderated"

### 7. Contacts Management Section

#### Contact Submissions
- View and manage contact forms
- Respond to inquiries
- Track response times
- Categorize contacts

#### Charts (4 minimum, varied types)
1. **Contact Volume Trends**: Area chart of daily submissions
2. **Category Distribution**: Pie chart of contact types
3. **Response Time Analytics**: Line chart of average response times
4. **Resolution Rates**: Donut chart of resolved vs. pending

#### Tables
- Contacts Table: columns - Name, Email, Subject, Category, Status, Submitted, Response Time
- Response Log: columns - Contact, Responder, Response, Date, Resolution

#### Modals
- Contact Details Modal: Full message and history
- Response Composer Modal: Send replies to contacts
- Category Manager Modal: Organize contact categories

#### Actions with Toasts
- Respond to Contact: "Response sent successfully"
- Mark Resolved: "Contact marked as resolved"
- Categorize: "Contact categorized"
- Archive: "Contact archived"

### 8. Analytics Section

#### Platform Analytics
- User growth charts
- Revenue analytics
- Content generation trends
- Feature usage statistics

#### Charts (4 minimum, varied types)
1. **Platform Growth**: Line chart of overall metrics
2. **Revenue Breakdown**: Pie chart by source
3. **Feature Usage**: Area chart of tool utilization
4. **User Segmentation**: Scatter plot of user behavior clusters

#### Tables
- Analytics Summary: columns - Metric, Current, Previous, Change %
- User Segments: columns - Segment, Users, Avg Revenue, Engagement

#### Modals
- Custom Report Modal: Generate specific analytics reports
- Trend Analysis Modal: Deep dive into trends

#### Actions with Toasts
- Generate Report: "Report generated"
- Export Analytics: "Analytics exported"
- Schedule Report: "Report scheduled"

### 9. Reports Section

#### Financial Reports
- Subscription revenue by plan
- Payment success/failure rates
- Refund analytics
- Revenue projections

#### Charts (4 minimum, varied types)
1. **Revenue Projections**: Line chart with forecasting
2. **Payment Success Rates**: Donut chart of transaction outcomes
3. **Refund Trends**: Area chart of refund volumes
4. **Plan Performance**: Pie chart of revenue by plan

#### Tables
- Financial Summary: columns - Period, Revenue, Refunds, Net, Growth
- Transaction Details: columns - Date, User, Amount, Status, Plan

#### Modals
- Report Generator Modal: Create custom financial reports
- Projection Calculator Modal: Revenue forecasting tools

#### Actions with Toasts
- Generate Financial Report: "Financial report created"
- Export Transactions: "Transactions exported"
- Update Projections: "Projections updated"

### 10. Settings Section

#### System Settings
- Platform configuration
- Subscription pricing
- Feature toggles
- API rate limits

#### Charts (4 minimum, varied types)
1. **Configuration Changes**: Line chart of setting modifications
2. **Feature Adoption**: Area chart of enabled features
3. **API Usage**: Pie chart of endpoint utilization
4. **Rate Limit Monitoring**: Scatter plot of API calls vs. limits

#### Tables
- Settings Overview: columns - Category, Setting, Value, Last Modified
- API Logs: columns - Endpoint, Requests, Errors, Avg Response Time

#### Modals
- Settings Editor Modal: Modify platform configurations
- Feature Toggle Modal: Enable/disable platform features

#### Actions with Toasts
- Update Settings: "Settings updated successfully"
- Toggle Feature: "Feature toggled"
- Reset to Defaults: "Settings reset"

### 11. Admin Profile Section

#### Profile Management
- Personal information
- Security settings
- Activity logs
- Preferences

#### Charts (4 minimum, varied types)
1. **Activity Timeline**: Line chart of admin actions
2. **Login History**: Area chart of login patterns
3. **Permission Usage**: Donut chart of accessed features
4. **Performance Metrics**: Scatter plot of action efficiency

#### Tables
- Profile Details: columns - Field, Value, Last Updated
- Activity Log: columns - Date, Action, Target, Status

#### Modals
- Profile Editor Modal: Update personal information
- Security Settings Modal: Change password, enable 2FA
- Activity Details Modal: View detailed action logs

#### Actions with Toasts
- Update Profile: "Profile updated"
- Change Password: "Password changed"
- Enable 2FA: "Two-factor authentication enabled"

### 5. System Administration

#### Security Monitoring
- Failed login attempts
- Suspicious activities
- Account lockouts
- Security incidents

## Required API Endpoints

### Admin Authentication
```javascript
POST /api/admin/login
GET /api/admin/verify
POST /api/admin/logout
```

### User Management APIs
```javascript
GET /api/admin/users // List users with pagination/filtering
GET /api/admin/users/:id // Get user details
PUT /api/admin/users/:id // Update user
DELETE /api/admin/users/:id // Delete user
POST /api/admin/users/:id/reset-password // Reset user password
GET /api/admin/users/:id/activity // Get user activity log
```

### Content Management APIs
```javascript
GET /api/admin/courses // List all courses
GET /api/admin/courses/:id // Get course details
PUT /api/admin/courses/:id // Update course
DELETE /api/admin/courses/:id // Delete course
GET /api/admin/quizzes // List all quizzes
GET /api/admin/quizzes/:id // Get quiz details
PUT /api/admin/quizzes/:id // Update quiz
DELETE /api/admin/quizzes/:id // Delete quiz
```

### Analytics APIs
```javascript
GET /api/admin/analytics/overview // Dashboard metrics
GET /api/admin/analytics/users // User analytics
GET /api/admin/analytics/revenue // Revenue analytics
GET /api/admin/analytics/content // Content performance
GET /api/admin/analytics/activity // Activity logs
```

### Blog Management APIs
```javascript
GET /api/admin/posts // List posts
POST /api/admin/posts // Create post
GET /api/admin/posts/:id // Get post
PUT /api/admin/posts/:id // Update post
DELETE /api/admin/posts/:id // Delete post
GET /api/admin/posts/:id/comments // Get comments
DELETE /api/admin/comments/:id // Delete comment
```

## Database Queries for Analytics

### User Analytics Queries
```javascript
// Total users by status
db.users.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// User registration trends
db.users.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])

// Subscription distribution
db.users.aggregate([
  { $group: { _id: "$subscription.plan", count: { $sum: 1 } } }
])
```

### Content Analytics Queries
```javascript
// Course generation trends
db.courses.aggregate([
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])

// Most popular courses (by user enrollment)
db.users.aggregate([
  { $unwind: "$courses" },
  { $group: { _id: "$courses.courseId", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

### Revenue Analytics Queries
```javascript
// Monthly revenue
db.users.aggregate([
  { $unwind: "$billingHistory" },
  {
    $match: {
      "billingHistory.status": "success",
      "billingHistory.type": "subscription"
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$billingHistory.date" },
        month: { $month: "$billingHistory.date" }
      },
      revenue: { $sum: "$billingHistory.amount" }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
])
```

### Activity Analytics Queries
```javascript
// Daily active users
db.useractivities.aggregate([
  {
    $match: {
      timestamp: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$timestamp" },
        month: { $month: "$timestamp" },
        day: { $dayOfMonth: "$timestamp" }
      },
      users: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      date: "$_id",
      activeUsers: { $size: "$users" }
    }
  },
  { $sort: { "date.year": 1, "date.month": 1, "date.day": 1 } }
])
```

## Charts and Visualizations

### 1. User Growth Chart
- **Type**: Line chart
- **Data**: Daily/weekly/monthly user registrations
- **Metrics**: New users, total users
- **Time Range**: Last 30/90/365 days

### 2. Revenue Analytics
- **Type**: Bar chart + line chart
- **Data**: Monthly revenue, subscription types
- **Metrics**: Revenue by plan, total revenue
- **Time Range**: Monthly view with yearly comparison

### 3. Content Generation Trends
- **Type**: Area chart
- **Data**: Courses, quizzes, flashcards generated over time
- **Metrics**: Generation volume by content type
- **Time Range**: Weekly/monthly trends

### 4. User Engagement Metrics
- **Type**: Multiple line charts
- **Data**: Daily active users, session duration, course completions
- **Metrics**: Engagement rates, retention
- **Time Range**: Last 30 days

### 5. Geographic Distribution
- **Type**: World map or pie chart
- **Data**: User locations (if IP tracking enabled)
- **Metrics**: Users by country/region
- **Display**: Top 10 countries with percentages

### 6. Subscription Distribution
- **Type**: Donut chart
- **Data**: Users by subscription plan
- **Metrics**: Free vs Premium breakdown
- **Display**: Percentage and count for each plan

### 7. Course Performance
- **Type**: Bar chart
- **Data**: Most popular courses by enrollment
- **Metrics**: Enrollment count, completion rate
- **Display**: Top 10 courses with statistics

### 8. Quiz Performance Analytics
- **Type**: Scatter plot or box plot
- **Data**: Quiz scores distribution
- **Metrics**: Average scores, completion rates
- **Display**: Performance by difficulty level

## Implementation Architecture

### Frontend Components Structure
```
src/app/admin/
├── layout.js                    // Admin layout with navigation
├── page.js                      // Dashboard overview
├── users/
│   ├── page.js                  // User management
│   ├── [id]/
│   │   └── page.js              // User details
│   └── components/
│       ├── UserTable.jsx
│       ├── UserFilters.jsx
│       └── UserDetailsModal.jsx
├── content/
│   ├── page.js                  // Content management
│   ├── courses/
│   ├── quizzes/
│   └── blog/
├── analytics/
│   ├── page.js                  // Analytics dashboard
│   ├── components/
│   │   ├── UserGrowthChart.jsx
│   │   ├── RevenueChart.jsx
│   │   └── EngagementMetrics.jsx
└── settings/
    └── page.js                  // System settings
```

### Sidebar Navigation

The admin dashboard features a collapsible sidebar with the following structure:

#### Main Navigation Links
- **Overview**: Dashboard overview page
- **Users**: User management section
- **Courses**: Course management
- **Flashcards**: Flashcard management
- **Tests**: Quiz/Test management
- **Blogs**: Blog management
- **Contacts**: Contact management
- **Analytics**: Analytics dashboard
- **Reports**: Reports section

#### Bottom User Menu
- **User Icon**: Displays admin name and email
  - When clicked, toggles a dropdown menu with:
    - **Profile**: Admin profile page
    - **Settings**: System settings
    - **Logout**: Logout action

The sidebar uses the light/dark theme with glassy effects and no box shadows. Navigation links highlight on active page and show hover effects with blue/purple gradients.

### State Management
- Use React Context or Zustand for admin state
- Cache analytics data with React Query
- Implement real-time updates for live metrics

### Security Considerations
- Admin role-based access control
- Audit logging for all admin actions
- Rate limiting for admin APIs
- Secure data export functionality
- Two-factor authentication for admin accounts

## Development Roadmap

### Phase 1: Core Dashboard
1. Admin authentication system
2. Basic dashboard with key metrics
3. User management interface
4. Content moderation tools

### Phase 2: Analytics
1. Comprehensive analytics dashboard
2. Advanced filtering and search
3. Data export functionality
4. Real-time monitoring

### Phase 3: Advanced Features
1. Automated reports and alerts
2. Bulk operations
3. Advanced user segmentation
4. Predictive analytics

## Conclusion

This documentation provides a comprehensive blueprint for developing a robust admin dashboard for the Actinova AI Tutor platform. The dashboard will enable administrators to effectively manage users, content, and monitor platform performance through detailed analytics and intuitive interfaces.

The implementation should prioritize security, performance, and user experience while providing the necessary tools for platform administration and growth monitoring.