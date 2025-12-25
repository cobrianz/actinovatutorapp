```markdown
# Actinova AI Tutor

A comprehensive AI-powered learning platform that creates personalized courses, flashcards, and quizzes to accelerate your learning journey.

![Actinova AI Tutor](logo.png)

## Features

### Core Learning Features

- **AI-Generated Courses**: Create structured learning paths with modules and lessons
- **Interactive Flashcards**: Spaced repetition system for improved retention
- **Smart Quizzes**: AI-generated tests with multiple-choice questions
- **Progress Tracking**: Monitor your learning journey with detailed analytics
- **Personalized Recommendations**: AI-driven course suggestions based on your interests

### User Experience

- **Responsive Design**: Seamless experience across desktop, tablet, and mobile devices
- **Dark/Light Mode**: Automatic theme detection with manual override
- **Real-time Collaboration**: Community discussions and shared learning resources
- **Offline Access**: Download courses and materials for offline study
- **Multi-language Support**: Content available in multiple languages

### Premium Features

- **Unlimited Generations**: Create unlimited courses and flashcards
- **Advanced Analytics**: In-depth learning insights and progress reports
- **Priority Support**: Direct access to learning experts
- **PDF Export**: Download courses as professionally formatted PDFs
- **Advanced AI Models**: Access to premium AI models for enhanced content quality

## Tech Stack

### Frontend

- **Next.js 15** – React framework with App Router
- **React 19** – Latest React version with concurrent features
- **Tailwind CSS** – Utility-first CSS framework
- **Radix UI** – Accessible component primitives
- **Framer Motion** – Smooth animations and transitions

### Backend & Database

- **Next.js API Routes** – Serverless API endpoints
- **MongoDB** – NoSQL database with Mongoose ODM
- **JWT Authentication** – Secure token-based authentication
- **bcrypt** – Password hashing and verification

### AI & External Services

- **OpenAI GPT-4** – Course and quiz generation
- **Paystack** – Payment processing for premium features
- **Resend** – Email delivery service
- **PDF-lib** – PDF generation and manipulation

### Development Tools

- **ESLint** – Code linting and formatting
- **Husky** – Git hooks for code quality
- **TypeScript** – Type safety throughout the codebase

## Prerequisites

- Node.js 18.17 or later
- MongoDB 6.0 or later (local or cloud instance)
- npm or yarn package manager

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/actinova-ai-tutor.git
cd actinova-ai-tutor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/actinova-ai-tutor
MONGODB_DB_NAME=actinova-ai-tutor

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key-here

# Email Services (choose one)
RESEND_API_KEY=re_your-resend-api-key-here
# OR
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Payment Processing
PAYSTACK_SECRET_KEY=sk_test_your-paystack-secret-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 4. Database Setup

Ensure MongoDB is running, then create the database:

```bash
mongosh
use actinova-ai-tutor
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
actinova-ai-tutor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── billing/       # Payment processing
│   │   │   ├── courses/       # Course management
│   │   │   └── ...            # Additional API routes
│   │   ├── components/        # React components
│   │   │   ├── ui/            # Reusable UI components
│   │   │   └── ...            # Feature-specific components
│   │   ├── lib/               # Utility functions
│   │   │   ├── auth.js        # Authentication utilities
│   │   │   ├── db.js          # Database operations
│   │   │   └── ...            # Other utilities
│   │   └── models/            # Mongoose schemas
│   ├── middleware.js          # Next.js middleware
│   └── globals.css            # Global styles
├── public/                    # Static assets
├── package.json
├── next.config.mjs
├── tailwind.config.js
└── README.md
```

## Authentication System

### User Registration Flow

1. Email validation
2. Password complexity requirements (minimum 8 characters)
3. Email verification for account activation
4. Acceptance of terms of service

### Security Features

- JWT access and refresh tokens
- bcrypt password hashing (12 salt rounds)
- Rate limiting to prevent brute-force attacks
- Temporary account lockout after repeated failed attempts
- Secure HttpOnly cookies with SameSite protection

## Payment Integration

### Paystack Integration

- Supports Kenyan Shilling (KES)
- Webhook handling for real-time payment updates
- Subscription management (monthly/yearly)
- Automated refund processing

### Pricing Tiers

- **Free**: 2 course generations per month, up to 3 modules (6 lessons) per course
- **Pro**: 15 course generations per month, up to 20 modules (100 lessons) per course
- **Premium**: Unlimited generations with access to advanced AI models and features

## AI Content Generation

### Course Generation

- Hierarchical structure: Modules → Lessons → Content
- Adjustable difficulty levels: Beginner, Intermediate, Advanced
- Adaptive topic recommendations based on user preferences
- Quality fallback mechanisms for generation failures

### Quiz Generation

- Multiple-choice questions (4 options, single correct answer)
- Adaptive difficulty scaling
- Detailed performance tracking and analytics

## Database Schema

### Core Collections

- **users** – User profiles, authentication data, preferences
- **courses** – Generated course content and metadata
- **flashcards** – Flashcard sets and progress tracking
- **quizzes** – Generated quizzes and user performance
- **billing** – Payment history and subscription status

### Key Relationships

- One-to-many: Users → Courses, Flashcards
- Courses contain multiple modules and lessons
- Quizzes linked to users for performance history
- Billing records tied to user subscriptions

## API Reference

### Authentication Endpoints

#### POST `/api/signup`

Register a new user.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "user@example.com",
  "password": "securepassword",
  "confirmPassword": "securepassword",
  "acceptTerms": true
}
```

**Success Response:**
```json
{
  "success": true,
  "requiresVerification": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

#### POST `/api/login`

Authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "rememberMe": false
}
```

#### POST `/api/logout`

Invalidate session and clear cookies.

### Course Management

#### POST `/api/generate-course`

Generate a new course.

**Request Body:**
```json
{
  "topic": "Machine Learning Fundamentals",
  "difficulty": "intermediate",
  "format": "course"
}
```

**Success Response:**
```json
{
  "success": true,
  "courseId": "course_id",
  "content": {
    "title": "Machine Learning Fundamentals",
    "totalModules": 5,
    "totalLessons": 25,
    "modules": [...]
  }
}
```

### Billing

#### POST `/api/billing/create-session`

Initialize a subscription payment session.

**Request Body:**
```json
{
  "plan": "pro",
  "billingCycle": "monthly",
  "paymentMethod": "card"
}
```

## Deployment

### Production Environment Variables

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/actinova-prod
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=sk-production-key
PAYSTACK_SECRET_KEY=sk_live_production-key
NEXTAUTH_URL=https://yourdomain.com
```

### Build & Run Commands

```bash
npm ci
npm run build
npm start
```

### Recommended Hosting Platforms

- Vercel (optimized for Next.js)
- Netlify
- Railway
- AWS

## Security Considerations

### Data Protection

- Encryption at rest and in transit
- Comprehensive input validation
- Protection against SQL injection via ORM
- XSS mitigation through content sanitization and CSP headers

### Authentication Security

- Short-lived access tokens with refresh mechanism
- Strong password policies
- Secure session and cookie management
- Rate limiting and abuse protection

## Monitoring & Analytics

- User engagement metrics (completion rates, session duration)
- Performance monitoring (response times, error rates)
- AI usage tracking
- Payment and subscription analytics

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Adhere to ESLint rules
- Write clear, descriptive commit messages
- Thoroughly test changes
- Update documentation as needed
- Maintain high code quality

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Refer to this README and code comments
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Email**: support@actinova.com

### Common Issues

- Build failures → Verify all environment variables are set
- Database connection → Check MongoDB URI
- AI generation errors → Confirm OpenAI API key and quota
- Payment problems → Validate Paystack configuration

## Acknowledgments

- OpenAI for AI content generation capabilities
- Paystack for payment processing
- MongoDB for data storage
- Next.js team for the framework
- Tailwind CSS for styling utilities

---

Built for learners worldwide.#   a c t i n o v a t u t o r a p p  
 