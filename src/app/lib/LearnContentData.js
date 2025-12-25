export const courseData = {
  title: "TypeScript",
  level: "beginner",
  totalModules: 7,
  totalLessons: 42,
  progress: 0,
  modules: [
    {
      id: 1,
      title: "Introduction to TypeScript",
      lessons: [
        {
          title: "What is TypeScript and Why Use It?",
          content: `
  # What is TypeScript and Why Use It?
  
  TypeScript is a programming language developed and maintained by Microsoft. It is a strict syntactical superset of JavaScript and adds optional static type definitions to the language.
  
  ## Key Benefits of TypeScript
  
  ### 1. Static Type Checking
  TypeScript catches errors at compile time rather than runtime, making your code more reliable and easier to debug.
  
  \`\`\`typescript
  // TypeScript will catch this error at compile time
  let message: string = "Hello World";
  message = 42; // Error: Type 'number' is not assignable to type 'string'
  \`\`\`
  
  ### 2. Enhanced IDE Support
  - Better autocomplete and IntelliSense
  - Refactoring tools
  - Navigation features
  - Real-time error detection
  
  ### 3. Better Code Documentation
  Types serve as documentation, making code more self-explanatory and easier for teams to understand.
  
  ### 4. Gradual Adoption
  You can gradually migrate existing JavaScript projects to TypeScript without rewriting everything.
  
  ## When to Use TypeScript
  
  - Large-scale applications
  - Team projects
  - When you need better tooling support
  - Projects that require high reliability
  
  ## Real-World Examples
  
  Many popular projects use TypeScript:
  - Angular (built with TypeScript)
  - VS Code
  - Slack Desktop
  - WhatsApp Web
  
  TypeScript compiles to clean, readable JavaScript that runs anywhere JavaScript runs.
            `,
        },
        {
          title: "Setting Up Your Development Environment",
          content: `
  # Setting Up Your Development Environment
  
  Let's get your development environment ready for TypeScript development.
  
  ## Prerequisites
  
  Before we start, make sure you have:
  - Node.js (version 14 or higher)
  - A code editor (VS Code recommended)
  - Basic knowledge of JavaScript
  
  ## Installation Steps
  
  ### 1. Install Node.js
  Download and install Node.js from [nodejs.org](https://nodejs.org)
  
  ### 2. Install TypeScript Globally
  \`\`\`bash
  npm install -g typescript
  \`\`\`
  
  ### 3. Verify Installation
  \`\`\`bash
  tsc --version
  \`\`\`
  
  ### 4. Set Up VS Code
  Install the following extensions:
  - TypeScript Importer
  - Prettier
  - ESLint
  
  ## Project Setup
  
  ### 1. Create a New Project
  \`\`\`bash
  mkdir my-typescript-project
  cd my-typescript-project
  npm init -y
  \`\`\`
  
  ### 2. Install TypeScript Locally
  \`\`\`bash
  npm install -D typescript @types/node
  \`\`\`
  
  ### 3. Create tsconfig.json
  \`\`\`bash
  npx tsc --init
  \`\`\`
  
  ## Recommended tsconfig.json Settings
  
  \`\`\`json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  \`\`\`
  
  Your development environment is now ready!
            `,
        },
        "TypeScript Installation and Configuration",
        "Your First TypeScript Program: 'Hello, World!'",
        "Understanding the TypeScript Compiler (tsc)",
        "Basic TypeScript Syntax and Structure",
      ],
    },
    {
      id: 2,
      title: "Core TypeScript Types",
      lessons: [
        "Primitive Types: number, string, boolean",
        "Working with Arrays in TypeScript",
        "Tuples: Fixed-Length Arrays",
        "Enums: Defining Named Constants",
        "The 'any' Type and Its Implications",
        "Type Inference in TypeScript",
      ],
    },
    {
      id: 3,
      title: "Functions in TypeScript",
      lessons: [
        "Function Type Annotations",
        "Optional and Default Parameters",
        "Rest Parameters and Spread Syntax",
        "Function Overloading",
        "Arrow Functions vs Regular Functions",
      ],
    },
    {
      id: 4,
      title: "Object-Oriented Programming with TypeScript",
      lessons: [
        "Classes and Constructors",
        "Access Modifiers: public, private, protected",
        "Inheritance and Super Keyword",
        "Abstract Classes and Methods",
        "Static Properties and Methods",
      ],
    },
    {
      id: 5,
      title: "Interfaces and Types",
      lessons: [
        "Defining Interfaces",
        "Optional Properties",
        "Readonly Properties",
        "Index Signatures",
        "Extending Interfaces",
      ],
    },
    {
      id: 6,
      title: "Generics in TypeScript",
      lessons: [
        "Introduction to Generics",
        "Generic Functions",
        "Generic Classes",
        "Generic Constraints",
        "Utility Types",
      ],
    },
    {
      id: 7,
      title: "Modules and Namespaces",
      lessons: [
        "ES6 Modules in TypeScript",
        "Import and Export Statements",
        "Default Exports vs Named Exports",
        "Module Resolution",
        "Namespaces and Declaration Merging",
      ],
    },
  ],
};
