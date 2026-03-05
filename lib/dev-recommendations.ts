/**
 * Developer & UI Recommendation Engine
 * 
 * AI-guided recommendations for developers, UI frameworks,
 * free tools, and UX best practices
 * 
 * Features:
 * - Framework & stack detection
 * - UI component recommendations
 * - Free tool suggestions
 * - Color scheme guidance
 * - Template & asset recommendations
 */

import { validateResourceUrl } from './security';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type UIFramework = 'react' | 'vue' | 'angular' | 'svelte' | 'solid' | 'vanilla';
export type CSSFramework = 'tailwind' | 'bootstrap' | 'bulma' | 'chakraui' | 'shadcn' | 'mui';
export type Platform = 'web' | 'mobile' | 'desktop' | 'cross-platform';
export type AppType = 'landing-page' | 'dashboard' | 'ecommerce' | 'blog' | 'portfolio' | 'saas' | 'game';

export interface Tool {
  name: string;
  url: string;
  category: string;
  freeTier: boolean;
  description: string;
  bestFor: string[];
  learningCurve: 'easy' | 'medium' | 'hard';
}

export interface UIRecommendation {
  framework: UIFramework;
  cssFramework: CSSFramework;
  colorScheme: ColorScheme;
  components: string[];
  freeAssets: string[];
  tools: Tool[];
  templates: string[];
  estimatedSetupTime: number; // minutes
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  description: string;
}

export interface DevRecommendation {
  query: string;
  intent: 'learn' | 'build' | 'deploy' | 'design';
  platform: Platform;
  appType: AppType;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  uiRecommendation: UIRecommendation;
  tutorials: string[];
  documentation: string[];
  nextSteps: string[];
}

export interface ProjectBlueprint {
  name: string;
  description: string;
  techStack: {
    frontend?: string;
    backend?: string;
    database?: string;
    hosting?: string;
    styling?: string;
  };
  estimatedHours: number;
  difficulty: 'easy' | 'medium' | 'hard';
  milestones: string[];
}

// ==========================================
// CURATED DATABASE
// ==========================================

const uiFrameworks: Record<UIFramework, { name: string; description: string; bestFor: string[]; docs: string }> = {
  react: {
    name: 'React',
    description: 'Component-based library with huge ecosystem',
    bestFor: ['SPAs', 'complex UIs', 'large teams', 'job market'],
    docs: 'https://react.dev',
  },
  vue: {
    name: 'Vue.js',
    description: 'Progressive framework, easy to learn',
    bestFor: ['beginners', 'rapid prototyping', 'small-to-medium apps'],
    docs: 'https://vuejs.org',
  },
  angular: {
    name: 'Angular',
    description: 'Full-featured framework with everything included',
    bestFor: ['enterprise apps', 'large teams', ' TypeScript lovers'],
    docs: 'https://angular.io',
  },
  svelte: {
    name: 'Svelte',
    description: 'Compiler-based, no virtual DOM, fast',
    bestFor: ['performance', 'simple syntax', 'small bundles'],
    docs: 'https://svelte.dev',
  },
  solid: {
    name: 'SolidJS',
    description: 'Fine-grained reactivity, React-like syntax',
    bestFor: ['performance', 'React devs wanting speed'],
    docs: 'https://www.solidjs.com',
  },
  vanilla: {
    name: 'Vanilla JS',
    description: 'No framework, native web APIs',
    bestFor: ['learning', 'simple sites', 'performance critical'],
    docs: 'https://developer.mozilla.org',
  },
};

const cssFrameworks: Record<CSSFramework, { name: string; description: string; componentRich: boolean; learningCurve: 'easy' | 'medium' | 'hard' }> = {
  tailwind: {
    name: 'Tailwind CSS',
    description: 'Utility-first, highly customizable',
    componentRich: false,
    learningCurve: 'medium',
  },
  bootstrap: {
    name: 'Bootstrap',
    description: 'Classic component library',
    componentRich: true,
    learningCurve: 'easy',
  },
  bulma: {
    name: 'Bulma',
    description: 'Modern CSS-only framework',
    componentRich: true,
    learningCurve: 'easy',
  },
  chakraui: {
    name: 'Chakra UI',
    description: 'Accessible React components',
    componentRich: true,
    learningCurve: 'medium',
  },
  shadcn: {
    name: 'shadcn/ui',
    description: 'Copy-paste Tailwind components',
    componentRich: true,
    learningCurve: 'medium',
  },
  mui: {
    name: 'Material UI',
    description: 'Google Material Design for React',
    componentRich: true,
    learningCurve: 'medium',
  },
};

const freeTools: Tool[] = [
  {
    name: 'VS Code',
    url: 'https://code.visualstudio.com',
    category: 'code-editor',
    freeTier: true,
    description: 'Most popular free code editor',
    bestFor: ['all languages', 'extensions', 'debugging'],
    learningCurve: 'easy',
  },
  {
    name: 'Figma',
    url: 'https://figma.com',
    category: 'design',
    freeTier: true,
    description: 'Collaborative design tool',
    bestFor: ['UI design', 'prototyping', 'team collaboration'],
    learningCurve: 'medium',
  },
  {
    name: 'Penpot',
    url: 'https://penpot.app',
    category: 'design',
    freeTier: true,
    description: 'Open-source Figma alternative',
    bestFor: ['UI design', 'open source lovers'],
    learningCurve: 'medium',
  },
  {
    name: 'CodeSandbox',
    url: 'https://codesandbox.io',
    category: 'development',
    freeTier: true,
    description: 'Cloud IDE for rapid prototyping',
    bestFor: ['quick experiments', 'sharing code', 'React/Vue'],
    learningCurve: 'easy',
  },
  {
    name: 'Replit',
    url: 'https://replit.com',
    category: 'development',
    freeTier: true,
    description: 'Collaborative online IDE',
    bestFor: ['learning', 'teaching', 'quick deployment'],
    learningCurve: 'easy',
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com',
    category: 'hosting',
    freeTier: true,
    description: 'Frontend deployment platform',
    bestFor: ['React/Next.js', 'serverless', 'fast deploy'],
    learningCurve: 'easy',
  },
  {
    name: 'Netlify',
    url: 'https://netlify.com',
    category: 'hosting',
    freeTier: true,
    description: 'Jamstack hosting platform',
    bestFor: ['static sites', 'continuous deploy', 'forms'],
    learningCurve: 'easy',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    category: 'version-control',
    freeTier: true,
    description: 'Code hosting and collaboration',
    bestFor: ['version control', 'open source', 'portfolio'],
    learningCurve: 'medium',
  },
  {
    name: 'Unsplash',
    url: 'https://unsplash.com',
    category: 'assets',
    freeTier: true,
    description: 'Free high-quality photos',
    bestFor: ['hero images', 'backgrounds', 'stock photos'],
    learningCurve: 'easy',
  },
  {
    name: 'Heroicons',
    url: 'https://heroicons.com',
    category: 'assets',
    freeTier: true,
    description: 'Beautiful SVG icons',
    bestFor: ['UI icons', 'Tailwind projects'],
    learningCurve: 'easy',
  },
];

const colorSchemes: ColorScheme[] = [
  {
    name: 'Modern Cyan',
    primary: '#06b6d4',
    secondary: '#3b82f6',
    accent: '#8b5cf6',
    background: '#f8fafc',
    text: '#0f172a',
    description: 'Fresh, tech-forward palette',
  },
  {
    name: 'Warm Amber',
    primary: '#f59e0b',
    secondary: '#ef4444',
    accent: '#ec4899',
    background: '#fffbeb',
    text: '#1c1917',
    description: 'Friendly, energetic vibe',
  },
  {
    name: 'Professional Slate',
    primary: '#475569',
    secondary: '#64748b',
    accent: '#0ea5e9',
    background: '#f1f5f9',
    text: '#0f172a',
    description: 'Corporate, trustworthy feel',
  },
  {
    name: 'Nature Green',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#84cc16',
    background: '#f0fdf4',
    text: '#064e3b',
    description: 'Eco-friendly, calming aesthetic',
  },
  {
    name: 'Dark Mode Pro',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    background: '#0f172a',
    text: '#f8fafc',
    description: 'Modern dark theme for pros',
  },
];

// ==========================================
// INTENT DETECTION
// ==========================================

/**
 * Detect development intent from user query
 */
export function detectDevIntent(query: string): {
  intent: 'learn' | 'build' | 'deploy' | 'design';
  platform: Platform;
  appType: AppType;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  frameworks: UIFramework[];
} {
  const queryLower = query.toLowerCase();
  
  // Detect intent
  let intent: 'learn' | 'build' | 'deploy' | 'design' = 'build';
  if (/learn|tutorial|course|how to|getting started|beginner/i.test(queryLower)) {
    intent = 'learn';
  } else if (/deploy|host|publish|go live|production/i.test(queryLower)) {
    intent = 'deploy';
  } else if (/design|ui|ux|look|style|color|layout/i.test(queryLower)) {
    intent = 'design';
  }
  
  // Detect platform
  let platform: Platform = 'web';
  if (/mobile|ios|android|app|react native|flutter/i.test(queryLower)) {
    platform = 'mobile';
  } else if (/desktop|electron|tauri/i.test(queryLower)) {
    platform = 'desktop';
  } else if (/cross.?platform|universal|pwa/i.test(queryLower)) {
    platform = 'cross-platform';
  }
  
  // Detect app type
  let appType: AppType = 'landing-page';
  if (/dashboard|admin|analytics|data/i.test(queryLower)) {
    appType = 'dashboard';
  } else if (/shop|store|ecommerce|buy|sell|product/i.test(queryLower)) {
    appType = 'ecommerce';
  } else if (/blog|article|content|cms/i.test(queryLower)) {
    appType = 'blog';
  } else if (/portfolio|showcase|gallery/i.test(queryLower)) {
    appType = 'portfolio';
  } else if (/saas|startup|business|service/i.test(queryLower)) {
    appType = 'saas';
  } else if (/game|gaming|play/i.test(queryLower)) {
    appType = 'game';
  }
  
  // Detect skill level
  let skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (/beginner|newbie|starting|first/i.test(queryLower)) {
    skillLevel = 'beginner';
  } else if (/advanced|expert|complex|enterprise/i.test(queryLower)) {
    skillLevel = 'advanced';
  } else if (/some experience|intermediate|decent/i.test(queryLower)) {
    skillLevel = 'intermediate';
  }
  
  // Detect frameworks mentioned
  const frameworks: UIFramework[] = [];
  if (/react|next\.?js/i.test(queryLower)) frameworks.push('react');
  if (/vue|nuxt/i.test(queryLower)) frameworks.push('vue');
  if (/angular/i.test(queryLower)) frameworks.push('angular');
  if (/svelte|sveltekit/i.test(queryLower)) frameworks.push('svelte');
  if (/solid|solidjs/i.test(queryLower)) frameworks.push('solid');
  if (/vanilla|plain js|no framework/i.test(queryLower)) frameworks.push('vanilla');
  
  return { intent, platform, appType, skillLevel, frameworks };
}

// ==========================================
// RECOMMENDATION ENGINE
// ==========================================

/**
 * Generate UI/UX recommendations based on query and context
 */
export function generateUIRecommendation(
  query: string,
  detectedFrameworks: UIFramework[] = [],
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  appType: AppType = 'landing-page'
): UIRecommendation {
  // Select framework
  let framework: UIFramework;
  if (detectedFrameworks.length > 0) {
    framework = detectedFrameworks[0];
  } else if (skillLevel === 'beginner') {
    framework = 'vue'; // Easiest to learn
  } else if (skillLevel === 'advanced') {
    framework = 'react'; // Most versatile
  } else {
    framework = 'react';
  }
  
  // Select CSS framework
  let cssFramework: CSSFramework;
  if (framework === 'react') {
    cssFramework = skillLevel === 'advanced' ? 'shadcn' : 'tailwind';
  } else if (framework === 'vue') {
    cssFramework = 'tailwind';
  } else {
    cssFramework = 'tailwind';
  }
  
  // Select color scheme based on app type
  let colorScheme: ColorScheme;
  switch (appType) {
    case 'dashboard':
      colorScheme = colorSchemes.find(c => c.name === 'Dark Mode Pro') || colorSchemes[0];
      break;
    case 'ecommerce':
      colorScheme = colorSchemes.find(c => c.name === 'Warm Amber') || colorSchemes[0];
      break;
    case 'portfolio':
      colorScheme = colorSchemes.find(c => c.name === 'Modern Cyan') || colorSchemes[0];
      break;
    case 'saas':
      colorScheme = colorSchemes.find(c => c.name === 'Professional Slate') || colorSchemes[0];
      break;
    default:
      colorScheme = colorSchemes[0];
  }
  
  // Select components based on app type
  const componentsByType: Record<AppType, string[]> = {
    'landing-page': ['Hero', 'Features', 'CTA', 'Navbar', 'Footer'],
    'dashboard': ['Sidebar', 'Stats Cards', 'Charts', 'Tables', 'Header'],
    'ecommerce': ['Product Card', 'Cart', 'Checkout', 'Filters', 'Reviews'],
    'blog': ['Article Card', 'Author Bio', 'Comments', 'Share Buttons', 'Tag Cloud'],
    'portfolio': ['Gallery', 'Project Card', 'Skills', 'Contact Form', 'Testimonials'],
    'saas': ['Pricing Table', 'Feature Grid', 'Testimonials', 'FAQ', 'Signup Form'],
    'game': ['Score Board', 'Controls', 'Leaderboard', 'Settings', 'HUD'],
  };
  
  const components = componentsByType[appType];
  
  // Select relevant free assets
  const freeAssets = [
    'Heroicons (SVG icons)',
    'Unsplash (free photos)',
    'Google Fonts (typography)',
    'Framer Motion (animations) - optional',
  ];
  
  // Select relevant tools
  const relevantTools = freeTools.filter(tool => {
    if (tool.category === 'code-editor') return true;
    if (tool.category === 'hosting' && skillLevel !== 'advanced') return true;
    if (tool.category === 'assets') return true;
    if (tool.category === 'design' && appType !== 'dashboard') return true;
    return false;
  }).slice(0, 5);
  
  // Templates
  const templates = [
    `${uiFrameworks[framework].name} + ${cssFrameworks[cssFramework].name} starter`,
    `${appType} template with ${components.length} components`,
    'Responsive layout boilerplate',
  ];
  
  // Estimate setup time
  const estimatedSetupTime = skillLevel === 'beginner' ? 60 : skillLevel === 'intermediate' ? 30 : 15;
  
  return {
    framework,
    cssFramework,
    colorScheme,
    components,
    freeAssets,
    tools: relevantTools,
    templates,
    estimatedSetupTime,
    complexity: skillLevel,
  };
}

/**
 * Generate complete developer recommendation
 */
export function generateDevRecommendation(query: string): DevRecommendation {
  const { intent, platform, appType, skillLevel, frameworks } = detectDevIntent(query);
  
  const uiRecommendation = generateUIRecommendation(query, frameworks, skillLevel, appType);
  
  // Generate tutorials
  const tutorials = [
    `${uiRecommendation.framework} Official Tutorial`,
    `${uiRecommendation.cssFramework} Crash Course`,
    `Building a ${appType.replace('-', ' ')} from scratch`,
  ];
  
  // Generate documentation links
  const documentation = [
    uiFrameworks[uiRecommendation.framework].docs,
    'https://developer.mozilla.org',
    'https://caniuse.com',
  ];
  
  // Generate next steps
  const nextSteps = [
    `Set up ${uiRecommendation.framework} project with ${uiRecommendation.cssFramework}`,
    `Implement ${uiRecommendation.components[0]} component`,
    'Add responsive navigation',
    'Deploy to Vercel or Netlify',
  ];
  
  return {
    query,
    intent,
    platform,
    appType,
    skillLevel,
    uiRecommendation,
    tutorials,
    documentation,
    nextSteps,
  };
}

/**
 * Generate project blueprint
 */
export function generateProjectBlueprint(
  name: string,
  description: string,
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
): ProjectBlueprint {
  const frameworks = skillLevel === 'beginner' ? ['React', 'Vue'] : ['Next.js', 'React'];
  const framework = frameworks[0];
  
  const backends = skillLevel === 'beginner' ? ['Firebase', 'Supabase'] : ['Node.js/Express', 'Next.js API'];
  const databases = skillLevel === 'beginner' ? ['Firestore', 'PostgreSQL (Supabase)'] : ['PostgreSQL', 'MongoDB'];
  
  return {
    name,
    description,
    techStack: {
      frontend: framework,
      backend: backends[0],
      database: databases[0],
      hosting: 'Vercel or Netlify',
      styling: 'Tailwind CSS',
    },
    estimatedHours: skillLevel === 'beginner' ? 20 : skillLevel === 'intermediate' ? 40 : 80,
    difficulty: skillLevel === 'beginner' ? 'easy' : skillLevel === 'intermediate' ? 'medium' : 'hard',
    milestones: [
      'Setup project & environment',
      'Build core UI components',
      'Implement main features',
      'Add authentication (if needed)',
      'Deploy & test',
    ],
  };
}

// ==========================================
// EXPORT HELPERS
// ==========================================

export function getRecommendedTools(category?: string): Tool[] {
  if (category) {
    return freeTools.filter(t => t.category === category);
  }
  return freeTools;
}

export function getColorSchemes(): ColorScheme[] {
  return colorSchemes;
}

export function getFrameworkInfo(framework: UIFramework) {
  return uiFrameworks[framework];
}

export function getCSSFrameworkInfo(cssFramework: CSSFramework) {
  return cssFrameworks[cssFramework];
}

// ==========================================
// FORMATTING
// ==========================================

export function formatUIRecommendation(rec: UIRecommendation): string {
  return `
🎨 **Recommended Stack**

**Framework:** ${uiFrameworks[rec.framework].name} - ${uiFrameworks[rec.framework].description}
**Styling:** ${cssFrameworks[rec.cssFramework].name} - ${cssFrameworks[rec.cssFramework].description}

🎯 **Color Scheme: ${rec.colorScheme.name}**
- Primary: ${rec.colorScheme.primary}
- Secondary: ${rec.colorScheme.secondary}
- Background: ${rec.colorScheme.background}
${rec.colorScheme.description}

🧩 **Key Components to Build**
${rec.components.map(c => `- ${c}`).join('\n')}

🛠️ **Free Tools**
${rec.tools.map(t => `- [${t.name}](${t.url}) - ${t.description}`).join('\n')}

📦 **Templates**
${rec.templates.map(t => `- ${t}`).join('\n')}

⏱️ **Estimated Setup Time:** ${rec.estimatedSetupTime} minutes
  `.trim();
}
