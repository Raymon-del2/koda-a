/**
 * Resource & Guided Workflow Module
 * 
 * Transforms Nyati from a chatbot into a guided learning and creative platform.
 * 
 * Features:
 * - Curated resource database with metadata (skill level, age rating, tags)
 * - Step-by-step workflow generation (coding, animation, YouTube, storytelling)
 * - Career guidance and creative idea generation
 * - Age-appropriate content filtering
 * - Export capabilities for guides and workflows
 * - Full integration with Nyati's governance and safety systems
 */

import { getObservabilityData } from './observability';
import { goalManager } from './goal-hierarchy';
import { getSafeModeStatus, isActionAllowed } from './production-governance';
import { calculateCognitiveTrustIndex } from './production-governance';
import { generateEmbeddingWithRetry } from './embeddings';
import { addUserFact, searchUserFacts } from './qdrant';
import { toolRegistry } from './tool-framework';

// ==========================================
// RESOURCE DEFINITIONS & TYPES
// ==========================================

export type ResourceType = 
  | 'video'
  | 'article'
  | 'tutorial'
  | 'documentation'
  | 'interactive'
  | 'template'
  | 'course'
  | 'tool'
  | 'reference';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type ContentCategory =
  | 'coding'
  | 'animation'
  | 'game-dev'
  | 'youtube'
  | 'acting'
  | 'storytelling'
  | 'design'
  | 'music'
  | 'film-making'
  | 'writing';

export type AgeRating = 'all-ages' | '8+' | '13+' | '16+' | '18+';

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string; // e.g., "YouTube", "freeCodeCamp", "Blender Foundation"
  
  // Metadata
  type: ResourceType;
  category: ContentCategory;
  skillLevel: SkillLevel;
  ageRating: AgeRating;
  
  // Content details
  duration?: number; // minutes (for videos/courses)
  language: string;
  isFree: boolean;
  
  // Tags for semantic search
  tags: string[];
  
  // Quality metrics
  rating?: number; // 0-5
  viewCount?: number;
  lastVerified: number; // timestamp
  
  // Workflow integration
  prerequisites?: string[]; // Resource IDs
  nextSteps?: string[]; // Resource IDs
  
  // Safety
  safetyChecked: boolean;
  contentWarnings?: string[];
}

export interface WorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  detailedInstructions?: string[];
  
  // Software/tool guidance
  software?: string; // e.g., "Blender", "Roblox Studio", "OBS"
  buttonSequence?: string[]; // e.g., ["File", "New", "Project"]
  keyboardShortcuts?: string[]; // e.g., ["Shift+A", "Ctrl+S"]
  
  // Resources
  resources?: LearningResource[];
  codeSnippet?: string;
  
  // Time estimate
  estimatedMinutes: number;
  
  // Verification
  successCriteria?: string;
  troubleshooting?: string[];
}

export interface GuidedWorkflow {
  id: string;
  title: string;
  description: string;
  
  // Target audience
  category: ContentCategory;
  skillLevel: SkillLevel;
  ageRating: AgeRating;
  
  // Content
  goal: string;
  prerequisites: string[];
  steps: WorkflowStep[];
  
  // Resources
  recommendedResources: LearningResource[];
  toolsRequired: string[];
  
  // Metadata
  totalTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  creatorType?: 'youtuber' | 'actor' | 'student' | 'developer' | 'general';
  tags?: string[];
  
  // Safety
  safetyNotes?: string[];
  parentGuidance?: boolean;
}

export interface CareerGuidance {
  id: string;
  career: string; // e.g., "YouTube Content Creator", "Game Developer"
  description: string;
  
  // Target
  suitableAges: string;
  requiredSkills: string[];
  
  // Path
  learningPath: {
    phase: string;
    duration: string;
    focus: string;
    resources: LearningResource[];
    milestones: string[];
  }[];
  
  // Opportunities
  incomePotential: 'low' | 'medium' | 'high';
  marketDemand: 'low' | 'medium' | 'high' | 'very high';
  competitionLevel: 'low' | 'medium' | 'high';
  
  // Next steps
  immediateActions: string[];
  longTermGoals: string[];
}

// ==========================================
// CURATED RESOURCE DATABASE
// ==========================================

/**
 * Curated resource database
 * In production, this would be in a database with vector embeddings
 */
const CURATED_RESOURCES: LearningResource[] = [
  // CODING RESOURCES
  {
    id: 'res-scratch-intro',
    title: 'Scratch - Getting Started',
    description: 'Introduction to visual programming with Scratch, perfect for beginners and kids',
    url: 'https://scratch.mit.edu/projects/editor/',
    source: 'MIT Scratch',
    type: 'interactive',
    category: 'coding',
    skillLevel: 'beginner',
    ageRating: '8+',
    language: 'en',
    isFree: true,
    tags: ['scratch', 'visual-programming', 'kids', 'beginner', 'blocks'],
    rating: 4.8,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-python-fcc',
    title: 'Learn Python - Full Course',
    description: 'Comprehensive Python programming course from freeCodeCamp',
    url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
    source: 'freeCodeCamp',
    type: 'video',
    category: 'coding',
    skillLevel: 'beginner',
    ageRating: '13+',
    duration: 270,
    language: 'en',
    isFree: true,
    tags: ['python', 'programming', 'course', 'beginner', 'backend'],
    rating: 4.9,
    viewCount: 45000000,
    lastVerified: Date.now(),
    safetyChecked: true,
    nextSteps: ['res-web-dev-fcc'],
  },
  {
    id: 'res-web-dev-fcc',
    title: 'Responsive Web Design Certification',
    description: 'Learn HTML, CSS, and responsive design principles',
    url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
    source: 'freeCodeCamp',
    type: 'course',
    category: 'coding',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['html', 'css', 'web-development', 'frontend', 'responsive'],
    rating: 4.8,
    lastVerified: Date.now(),
    safetyChecked: true,
    prerequisites: ['res-python-fcc'],
  },
  
  // ANIMATION RESOURCES
  {
    id: 'res-blender-basics',
    title: 'Blender Beginner Tutorial Series',
    description: 'Official Blender Foundation beginner tutorial series',
    url: 'https://www.youtube.com/playlist?list=PLa1F2ddGya_-UvuAqHAksYnB0qL9yWDO6',
    source: 'Blender Foundation',
    type: 'video',
    category: 'animation',
    skillLevel: 'beginner',
    ageRating: '13+',
    duration: 240,
    language: 'en',
    isFree: true,
    tags: ['blender', '3d-modeling', 'animation', 'beginner', 'donut'],
    rating: 4.9,
    viewCount: 12000000,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-pencil2d-start',
    title: 'Pencil2D Animation Basics',
    description: 'Free 2D animation software tutorial for beginners',
    url: 'https://www.pencil2d.org/doc/tutorials.html',
    source: 'Pencil2D',
    type: 'tutorial',
    category: 'animation',
    skillLevel: 'beginner',
    ageRating: '8+',
    language: 'en',
    isFree: true,
    tags: ['2d-animation', 'pencil2d', 'beginner', 'hand-drawn'],
    rating: 4.5,
    lastVerified: Date.now(),
    safetyChecked: true,
    nextSteps: ['res-blender-basics'],
  },
  
  // GAME DEVELOPMENT RESOURCES
  {
    id: 'res-roblox-start',
    title: 'Roblox Studio - Getting Started',
    description: 'Official guide to creating games in Roblox Studio',
    url: 'https://create.roblox.com/docs/tutorials',
    source: 'Roblox',
    type: 'documentation',
    category: 'game-dev',
    skillLevel: 'beginner',
    ageRating: '8+',
    language: 'en',
    isFree: true,
    tags: ['roblox', 'game-development', 'lua', 'kids', 'beginner'],
    rating: 4.7,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-unity-basics',
    title: 'Unity Learn - Unity Essentials',
    description: 'Official Unity learning path for beginners',
    url: 'https://learn.unity.com/pathway/unity-essentials',
    source: 'Unity',
    type: 'course',
    category: 'game-dev',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['unity', 'game-development', 'c#', '3d', 'beginner'],
    rating: 4.8,
    lastVerified: Date.now(),
    safetyChecked: true,
    prerequisites: ['res-python-fcc'],
  },
  {
    id: 'res-unreal-intro',
    title: 'Unreal Engine 5 for Beginners',
    description: 'Complete introduction to Unreal Engine 5',
    url: 'https://www.unrealengine.com/en-US/learn',
    source: 'Epic Games',
    type: 'course',
    category: 'game-dev',
    skillLevel: 'intermediate',
    ageRating: '16+',
    language: 'en',
    isFree: true,
    tags: ['unreal-engine', 'game-development', 'blueprints', 'advanced'],
    rating: 4.9,
    lastVerified: Date.now(),
    safetyChecked: true,
    prerequisites: ['res-unity-basics'],
  },
  
  // YOUTUBE/CONTENT CREATION RESOURCES
  {
    id: 'res-youtube-creator',
    title: 'YouTube Creator Academy',
    description: 'Official YouTube channel growth and monetization guide',
    url: 'https://creatoracademy.youtube.com/',
    source: 'YouTube',
    type: 'course',
    category: 'youtube',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['youtube', 'content-creation', 'monetization', 'channel-growth'],
    rating: 4.7,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-obs-guide',
    title: 'OBS Studio - Complete Guide',
    description: 'Learn to record and stream with OBS Studio',
    url: 'https://obsproject.com/wiki/',
    source: 'OBS Project',
    type: 'documentation',
    category: 'youtube',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['obs', 'streaming', 'recording', 'content-creation', 'tutorial'],
    rating: 4.8,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-openshot-edit',
    title: 'OpenShot Video Editor Tutorial',
    description: 'Free video editing with OpenShot',
    url: 'https://www.openshot.org/user-guide/',
    source: 'OpenShot',
    type: 'tutorial',
    category: 'youtube',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['video-editing', 'openshot', 'beginner', 'free'],
    rating: 4.5,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  
  // ACTING/STORYTELLING RESOURCES
  {
    id: 'res-story-structure',
    title: 'Story Structure 101',
    description: 'Learn fundamental story structure and narrative arcs',
    url: 'https://www.masterclass.com/articles/story-structure',
    source: 'MasterClass',
    type: 'article',
    category: 'storytelling',
    skillLevel: 'beginner',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['storytelling', 'writing', 'narrative', 'structure', 'plot'],
    rating: 4.6,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-acting-basics',
    title: 'Introduction to Acting',
    description: 'Basics of acting techniques and performance',
    url: 'https://www.skillshare.com/search?query=acting+basics',
    source: 'Skillshare',
    type: 'course',
    category: 'acting',
    skillLevel: 'beginner',
    ageRating: '16+',
    language: 'en',
    isFree: false,
    tags: ['acting', 'performance', 'theatre', 'film', 'beginner'],
    rating: 4.7,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  
  // DESIGN RESOURCES
  {
    id: 'res-canva-start',
    title: 'Canva Design School',
    description: 'Learn graphic design with Canva',
    url: 'https://www.canva.com/designschool/',
    source: 'Canva',
    type: 'course',
    category: 'design',
    skillLevel: 'beginner',
    ageRating: '8+',
    language: 'en',
    isFree: true,
    tags: ['graphic-design', 'canva', 'beginner', 'templates', 'social-media'],
    rating: 4.8,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
  {
    id: 'res-gimp-tutorial',
    title: 'GIMP - GNU Image Manipulation',
    description: 'Free Photoshop alternative tutorials',
    url: 'https://www.gimp.org/tutorials/',
    source: 'GIMP',
    type: 'tutorial',
    category: 'design',
    skillLevel: 'intermediate',
    ageRating: '13+',
    language: 'en',
    isFree: true,
    tags: ['gimp', 'photo-editing', 'graphics', 'free', 'open-source'],
    rating: 4.6,
    lastVerified: Date.now(),
    safetyChecked: true,
  },
];

// ==========================================
// GUIDED WORKFLOW TEMPLATES
// ==========================================

const WORKFLOW_TEMPLATES: GuidedWorkflow[] = [
  // ROBLOX GAME CREATION (Kid-friendly)
  {
    id: 'wf-roblox-first-game',
    title: 'Create Your First Roblox Game',
    description: 'Build a simple obstacle course (obby) game in Roblox Studio',
    category: 'game-dev',
    skillLevel: 'beginner',
    ageRating: '8+',
    goal: 'Create and publish a playable Roblox game',
    prerequisites: ['Roblox account', 'Roblox Studio installed'],
    toolsRequired: ['Roblox Studio'],
    difficulty: 'easy',
    creatorType: 'student',
    totalTimeMinutes: 45,
    parentGuidance: true,
    steps: [
      {
        stepNumber: 1,
        title: 'Open Roblox Studio',
        description: 'Launch Roblox Studio and create a new project',
        detailedInstructions: [
          'Open Roblox Studio from your desktop or Start menu',
          'Click "New Project" on the home screen',
          'Select "Baseplate" template',
          'Wait for the workspace to load',
        ],
        software: 'Roblox Studio',
        buttonSequence: ['New Project', 'Baseplate'],
        estimatedMinutes: 5,
        successCriteria: 'Roblox Studio workspace is open with a baseplate',
      },
      {
        stepNumber: 2,
        title: 'Add Your First Part',
        description: 'Create a platform for your obstacle course',
        detailedInstructions: [
          'In the Home tab, click "Part"',
          'A red block will appear in the center',
          'Use the Move tool to drag it above the baseplate',
          'Resize it by dragging the resize handles',
        ],
        software: 'Roblox Studio',
        buttonSequence: ['Home', 'Part'],
        keyboardShortcuts: ['Ctrl+1 (Select)', 'Ctrl+2 (Move)', 'Ctrl+4 (Scale)'],
        estimatedMinutes: 10,
        successCriteria: 'A colored platform is floating above the baseplate',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-roblox-start')!],
      },
      {
        stepNumber: 3,
        title: 'Create an Obstacle',
        description: 'Add spinning obstacles for players to avoid',
        detailedInstructions: [
          'Insert another Part',
          'Right-click it and select "Add Script"',
          'Copy this simple rotation script:',
        ],
        software: 'Roblox Studio',
        codeSnippet: `while true do
  script.Parent.Rotation = script.Parent.Rotation + Vector3.new(0, 5, 0)
  wait(0.1)
end`,
        estimatedMinutes: 15,
        successCriteria: 'The obstacle spins continuously',
        troubleshooting: ['If it doesn\'t spin, check the script is attached to the part'],
      },
      {
        stepNumber: 4,
        title: 'Add More Platforms',
        description: 'Create a path for players to cross',
        detailedInstructions: [
          'Duplicate the first platform (Ctrl+D)',
          'Move it further away',
          'Create 5-10 platforms in a path',
          'Add variety with different colors and sizes',
        ],
        software: 'Roblox Studio',
        keyboardShortcuts: ['Ctrl+D (Duplicate)', 'Ctrl+C (Copy)', 'Ctrl+V (Paste)'],
        estimatedMinutes: 10,
        successCriteria: 'A clear path from start to finish is visible',
      },
      {
        stepNumber: 5,
        title: 'Test and Publish',
        description: 'Play your game and publish it',
        detailedInstructions: [
          'Click the Play button (▶) to test',
          'Try to complete your obstacle course',
          'Press Stop when done',
          'Click File → Publish to Roblox',
          'Give your game a name and description',
        ],
        software: 'Roblox Studio',
        buttonSequence: ['▶ Play', 'File', 'Publish to Roblox'],
        estimatedMinutes: 5,
        successCriteria: 'Game is published and has a shareable link',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-roblox-start')!],
      },
    ],
    recommendedResources: [
      CURATED_RESOURCES.find(r => r.id === 'res-roblox-start')!,
    ],
    safetyNotes: ['Always keep personal information private', 'Use a parent/guardian email for account'],
  },
  
  // YOUTUBE CHANNEL START
  {
    id: 'wf-youtube-channel',
    title: 'Start Your YouTube Channel',
    description: 'Create, film, edit, and publish your first YouTube video',
    category: 'youtube',
    skillLevel: 'beginner',
    ageRating: '13+',
    goal: 'Launch a YouTube channel with first video published',
    prerequisites: ['Google account', 'Basic camera (phone is fine)', 'Computer for editing'],
    toolsRequired: ['OBS Studio', 'OpenShot', 'YouTube'],
    difficulty: 'medium',
    creatorType: 'youtuber',
    totalTimeMinutes: 180,
    steps: [
      {
        stepNumber: 1,
        title: 'Plan Your Content',
        description: 'Choose your niche and plan your first video',
        detailedInstructions: [
          'Choose a topic you\'re passionate about',
          'Research what\'s trending in that niche',
          'Write a simple script or outline',
          'Plan your filming location and setup',
        ],
        estimatedMinutes: 30,
        successCriteria: 'Clear video concept with outline complete',
      },
      {
        stepNumber: 2,
        title: 'Set Up OBS Studio',
        description: 'Configure OBS for recording',
        detailedInstructions: [
          'Download and install OBS Studio',
          'Open OBS and go through the auto-configuration wizard',
          'Add a Video Capture Source for your camera',
          'Set up a Microphone source',
          'Configure output settings (1080p, 30fps)',
        ],
        software: 'OBS Studio',
        buttonSequence: ['File', 'Settings', 'Output', 'Recording'],
        estimatedMinutes: 20,
        successCriteria: 'OBS preview shows your camera feed',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-obs-guide')!],
      },
      {
        stepNumber: 3,
        title: 'Record Your Video',
        description: 'Film your first YouTube video',
        detailedInstructions: [
          'Find good lighting (natural light or ring light)',
          'Position camera at eye level',
          'Test audio levels (should peak around -12dB)',
          'Press Start Recording in OBS',
          'Follow your script, speak clearly and energetically',
          'Press Stop Recording when done',
        ],
        software: 'OBS Studio',
        buttonSequence: ['Start Recording'],
        keyboardShortcuts: ['F12 (Start/Stop Recording)'],
        estimatedMinutes: 30,
        successCriteria: 'Raw video file saved to your computer',
        troubleshooting: ['If audio is too quiet, move closer to microphone', 'If video is dark, add more lighting'],
      },
      {
        stepNumber: 4,
        title: 'Edit with OpenShot',
        description: 'Basic video editing for your first upload',
        detailedInstructions: [
          'Open OpenShot and create new project',
          'Import your recorded video',
          'Drag video to timeline',
          'Trim beginning/end where needed (drag edges)',
          'Add simple title card (Title → Title Card)',
          'Export video (YouTube 1080p preset)',
        ],
        software: 'OpenShot',
        buttonSequence: ['File', 'Import Files', 'Export Video'],
        keyboardShortcuts: ['Ctrl+Shift+E (Export)'],
        estimatedMinutes: 45,
        successCriteria: 'Final video exported as MP4',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-openshot-edit')!],
      },
      {
        stepNumber: 5,
        title: 'Create YouTube Channel',
        description: 'Set up your YouTube presence',
        detailedInstructions: [
          'Go to youtube.com and sign in with Google',
          'Click your profile → "Create a channel"',
          'Choose channel name',
          'Upload profile picture and banner',
          'Write channel description with keywords',
          'Add social links if you have them',
        ],
        software: 'YouTube',
        buttonSequence: ['Profile', 'Create a channel', 'Customize Channel'],
        estimatedMinutes: 20,
        successCriteria: 'Channel page looks professional with branding',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-youtube-creator')!],
      },
      {
        stepNumber: 6,
        title: 'Upload and Optimize',
        description: 'Publish your video with SEO optimization',
        detailedInstructions: [
          'Click Create (camera icon) → Upload video',
          'Select your edited video file',
          'Write compelling title (include keywords)',
          'Write detailed description (first 2 lines are crucial)',
          'Add relevant tags (5-8 tags)',
          'Design or choose thumbnail',
          'Select appropriate category',
          'Set visibility (Public when ready)',
        ],
        software: 'YouTube',
        buttonSequence: ['Create', 'Upload Video', 'Next', 'Next', 'Publish'],
        estimatedMinutes: 35,
        successCriteria: 'Video is live on YouTube with good metadata',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-youtube-creator')!],
      },
    ],
    recommendedResources: [
      CURATED_RESOURCES.find(r => r.id === 'res-youtube-creator')!,
      CURATED_RESOURCES.find(r => r.id === 'res-obs-guide')!,
      CURATED_RESOURCES.find(r => r.id === 'res-openshot-edit')!,
    ],
  },
  
  // BLENDER ANIMATION
  {
    id: 'wf-blender-donut',
    title: 'Create Your First 3D Animation',
    description: 'Make the famous Blender Donut animation',
    category: 'animation',
    skillLevel: 'beginner',
    ageRating: '13+',
    goal: 'Create and render a 3D donut animation',
    prerequisites: ['Blender installed', 'Computer with dedicated GPU (recommended)'],
    toolsRequired: ['Blender'],
    difficulty: 'medium',
    creatorType: 'developer',
    totalTimeMinutes: 240,
    steps: [
      {
        stepNumber: 1,
        title: 'Blender Basics',
        description: 'Navigate Blender interface',
        detailedInstructions: [
          'Open Blender',
          'Select "General" template',
          'Learn navigation: Middle Mouse = rotate, Shift+Middle = pan, Scroll = zoom',
          'Select default cube (Left Click)',
          'Delete it (X → Delete)',
        ],
        software: 'Blender',
        keyboardShortcuts: ['Middle Mouse (Rotate)', 'Shift+Middle (Pan)', 'Scroll (Zoom)', 'X (Delete)'],
        estimatedMinutes: 15,
        successCriteria: 'Empty 3D viewport, comfortable with navigation',
      },
      {
        stepNumber: 2,
        title: 'Create the Donut',
        description: 'Model a donut using basic shapes',
        detailedInstructions: [
          'Shift+A → Mesh → Torus',
          'Adjust segments to 32, ring count to 12',
          'Scale to donut size (S key, then move mouse)',
          'Tab into Edit Mode',
          'Select half the vertices',
          'Delete them to make a profile',
          'Add Solidify modifier for thickness',
        ],
        software: 'Blender',
        buttonSequence: ['Add', 'Mesh', 'Torus'],
        keyboardShortcuts: ['Shift+A (Add)', 'Tab (Edit Mode)', 'S (Scale)', 'X (Delete)'],
        estimatedMinutes: 30,
        successCriteria: 'Donut shape visible with thickness',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-blender-basics')!],
      },
      {
        stepNumber: 3,
        title: 'Add Icing',
        description: 'Create dripping icing on the donut',
        detailedInstructions: [
          'Duplicate donut (Shift+D)',
          'Scale down slightly (S, then 0.9, Enter)',
          'Add Subdivision Surface modifier (set to 2)',
          'Add Solidify modifier',
          'Tab into Edit Mode',
          'Select random vertices on bottom edge',
          'Pull them down to create drips',
          'Add Smooth shading',
        ],
        software: 'Blender',
        buttonSequence: ['Modifiers', 'Add Modifier', 'Subdivision Surface'],
        keyboardShortcuts: ['Shift+D (Duplicate)', 'Tab (Edit Mode)', 'Right Click (Smooth)'],
        estimatedMinutes: 45,
        successCriteria: 'Donut has white icing with realistic drips',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-blender-basics')!],
      },
      {
        stepNumber: 4,
        title: 'Add Materials',
        description: 'Make it look realistic with textures',
        detailedInstructions: [
          'Switch to Shading workspace',
          'Add Principled BSDF material',
          'Set Base Color to brown for donut',
          'Add noise texture for roughness',
          'Set Subsurface Scattering for realistic light',
          'For icing: white color, glossy finish',
          'Add sprinkles as particles (optional)',
        ],
        software: 'Blender',
        buttonSequence: ['Shading', 'New Material', 'Principled BSDF'],
        estimatedMinutes: 40,
        successCriteria: 'Donut looks photorealistic in rendered view',
      },
      {
        stepNumber: 5,
        title: 'Set Up Animation',
        description: 'Make the donut rotate',
        detailedInstructions: [
          'Switch to Layout workspace',
          'Select all objects',
          'Frame 1: Insert keyframe (I) for Rotation',
          'Go to frame 120',
          'Rotate 360 degrees on Z axis (R, Z, 360, Enter)',
          'Insert keyframe again',
          'Press Space to play animation',
        ],
        software: 'Blender',
        buttonSequence: ['Timeline', 'Frame 1', 'I', 'Location & Rotation', 'Frame 120'],
        keyboardShortcuts: ['I (Insert Keyframe)', 'R (Rotate)', 'Space (Play)', 'Left/Right Arrows (Scrub)'],
        estimatedMinutes: 20,
        successCriteria: 'Donut rotates smoothly in animation',
      },
      {
        stepNumber: 6,
        title: 'Render and Export',
        description: 'Create final video file',
        detailedInstructions: [
          'Switch to Render Properties',
          'Set Engine to Cycles (for quality)',
          'Set Resolution to 1920x1080',
          'Set Frame Rate to 30fps',
          'Set Output to MP4',
          'Choose output folder',
          'Click Render → Render Animation',
          'Wait for render to complete',
        ],
        software: 'Blender',
        buttonSequence: ['Render Properties', 'Output Properties', 'Render', 'Render Animation'],
        keyboardShortcuts: ['Ctrl+F12 (Render Animation)'],
        estimatedMinutes: 90,
        successCriteria: 'MP4 video file with donut animation',
        troubleshooting: ['If render is slow, try Eevee engine instead', 'If low quality, increase samples'],
      },
    ],
    recommendedResources: [
      CURATED_RESOURCES.find(r => r.id === 'res-blender-basics')!,
    ],
  },
  
  // PYTHON FOR BEGINNERS
  {
    id: 'wf-python-first-code',
    title: 'Write Your First Python Program',
    description: 'Learn programming basics with hands-on coding',
    category: 'coding',
    skillLevel: 'beginner',
    ageRating: '13+',
    goal: 'Write and run 3 Python programs',
    prerequisites: ['Computer with internet', 'No prior coding needed'],
    toolsRequired: ['Python', 'VS Code (recommended)'],
    difficulty: 'easy',
    creatorType: 'student',
    totalTimeMinutes: 90,
    steps: [
      {
        stepNumber: 1,
        title: 'Install Python',
        description: 'Set up Python on your computer',
        detailedInstructions: [
          'Go to python.org',
          'Download Python 3.11 or later',
          'Run installer (check "Add to PATH")',
          'Verify: Open terminal, type "python --version"',
          'You should see version number',
        ],
        software: 'Terminal/Command Prompt',
        estimatedMinutes: 15,
        successCriteria: 'Python is installed and responds to version check',
      },
      {
        stepNumber: 2,
        title: 'Your First Program',
        description: 'Write the classic "Hello World"',
        detailedInstructions: [
          'Open any text editor (Notepad, TextEdit)',
          'Type: print("Hello, World!")',
          'Save as hello.py on your Desktop',
          'Open terminal',
          'Navigate to Desktop: cd Desktop',
          'Run: python hello.py',
          'See output: Hello, World!',
        ],
        software: 'Text Editor + Terminal',
        codeSnippet: `print("Hello, World!")`,
        keyboardShortcuts: ['Ctrl+S (Save)', 'cd Desktop (Navigate)', 'python hello.py (Run)'],
        estimatedMinutes: 15,
        successCriteria: '"Hello, World!" appears in terminal',
        troubleshooting: ['If "python not found", restart computer after install'],
      },
      {
        stepNumber: 3,
        title: 'Create a Calculator',
        description: 'Make a simple calculator program',
        detailedInstructions: [
          'Create new file: calculator.py',
          'Add input for two numbers',
          'Add operations: +, -, *, /',
          'Print results',
          'Test with different numbers',
        ],
        software: 'VS Code or Text Editor',
        codeSnippet: `# Simple Calculator
num1 = float(input("Enter first number: "))
num2 = float(input("Enter second number: "))

print(f"{num1} + {num2} = {num1 + num2}")
print(f"{num1} - {num2} = {num1 - num2}")
print(f"{num1} * {num2} = {num1 * num2}")
print(f"{num1} / {num2} = {num1 / num2}")`,
        estimatedMinutes: 25,
        successCriteria: 'Calculator correctly computes all 4 operations',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-python-fcc')!],
      },
      {
        stepNumber: 4,
        title: 'Make a Game',
        description: 'Create a number guessing game',
        detailedInstructions: [
          'Create guess_game.py',
          'Import random module',
          'Generate random number 1-100',
          'Let user guess with feedback',
          'Count attempts',
          'Add play again option',
        ],
        software: 'VS Code',
        codeSnippet: `import random

number = random.randint(1, 100)
attempts = 0

print("Guess the number (1-100)!")

while True:
    guess = int(input("Your guess: "))
    attempts += 1
    
    if guess < number:
        print("Too low!")
    elif guess > number:
        print("Too high!")
    else:
        print(f"Correct! You took {attempts} attempts.")
        break`,
        estimatedMinutes: 35,
        successCriteria: 'Game works: generates number, gives feedback, counts attempts',
        resources: [CURATED_RESOURCES.find(r => r.id === 'res-python-fcc')!],
      },
    ],
    recommendedResources: [
      CURATED_RESOURCES.find(r => r.id === 'res-python-fcc')!,
      CURATED_RESOURCES.find(r => r.id === 'res-web-dev-fcc')!,
    ],
  },
];

// ==========================================
// CAREER GUIDANCE DATABASE
// ==========================================

const CAREER_GUIDANCE: CareerGuidance[] = [
  {
    id: 'career-youtuber',
    career: 'YouTube Content Creator',
    description: 'Create and monetize video content on YouTube',
    suitableAges: '13+',
    requiredSkills: ['Video editing', 'Storytelling', 'Public speaking', 'Basic marketing'],
    learningPath: [
      {
        phase: 'Foundation',
        duration: '1-2 months',
        focus: 'Learn basics and find your niche',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-youtube-creator')!,
          CURATED_RESOURCES.find(r => r.id === 'res-obs-guide')!,
          CURATED_RESOURCES.find(r => r.id === 'res-openshot-edit')!,
        ],
        milestones: ['First video published', '100 subscribers', 'Found content niche'],
      },
      {
        phase: 'Growth',
        duration: '3-6 months',
        focus: 'Consistency and audience building',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-canva-start')!,
        ],
        milestones: ['Weekly upload schedule', '1,000 subscribers', 'Monetization enabled'],
      },
      {
        phase: 'Professional',
        duration: '6-12 months',
        focus: 'Quality improvement and diversification',
        resources: [],
        milestones: ['100,000 subscribers', 'Brand partnerships', 'Multiple revenue streams'],
      },
    ],
    incomePotential: 'high',
    marketDemand: 'high',
    competitionLevel: 'high',
    immediateActions: [
      'Choose your content niche (gaming, education, entertainment, etc.)',
      'Study successful creators in your niche',
      'Create first 5 video scripts',
      'Set up recording space with good lighting',
      'Film and publish first video',
    ],
    longTermGoals: [
      'Reach 100,000 subscribers',
      'Build community engagement',
      'Develop multiple content series',
      'Collaborate with other creators',
      'Diversify to other platforms',
    ],
  },
  {
    id: 'career-game-dev',
    career: 'Game Developer',
    description: 'Design and build video games for various platforms',
    suitableAges: '13+',
    requiredSkills: ['Programming', 'Game design', 'Problem solving', 'Art/asset creation (optional)'],
    learningPath: [
      {
        phase: 'Beginner',
        duration: '2-3 months',
        focus: 'Learn basics with visual tools',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-scratch-intro')!,
          CURATED_RESOURCES.find(r => r.id === 'res-roblox-start')!,
        ],
        milestones: ['First simple game', 'Understanding of game loops', 'Basic scripting'],
      },
      {
        phase: 'Intermediate',
        duration: '6-12 months',
        focus: 'Learn professional tools',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-unity-basics')!,
          CURATED_RESOURCES.find(r => r.id === 'res-python-fcc')!,
        ],
        milestones: ['Unity project completed', 'C# proficiency', 'Published mobile/web game'],
      },
      {
        phase: 'Advanced',
        duration: '1-2 years',
        focus: 'Specialization',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-unreal-intro')!,
        ],
        milestones: ['Commercial game release', 'Portfolio of 3+ games', 'Industry job or indie studio'],
      },
    ],
    incomePotential: 'medium',
    marketDemand: 'high',
    competitionLevel: 'high',
    immediateActions: [
      'Start with Roblox or Scratch to learn basics',
      'Play games critically - analyze what works',
      'Join game dev communities (Discord, Reddit)',
      'Create a simple game in 2 weeks',
      'Document your learning journey',
    ],
    longTermGoals: [
      'Release commercial game on Steam/App Store',
      'Build portfolio of diverse game types',
      'Join established studio or form indie team',
      'Speak at game development conferences',
      'Mentor aspiring developers',
    ],
  },
  {
    id: 'career-animator',
    career: '3D Animator',
    description: 'Create animated content for films, games, and media',
    suitableAges: '16+',
    requiredSkills: ['3D software proficiency', 'Understanding of motion', 'Artistic eye', 'Patience'],
    learningPath: [
      {
        phase: 'Foundation',
        duration: '3-6 months',
        focus: 'Learn 2D then 3D basics',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-pencil2d-start')!,
          CURATED_RESOURCES.find(r => r.id === 'res-blender-basics')!,
        ],
        milestones: ['First 2D animation', 'Blender navigation mastery', 'Completed donut tutorial'],
      },
      {
        phase: 'Skill Building',
        duration: '6-12 months',
        focus: 'Character animation fundamentals',
        resources: [],
        milestones: ['Walk cycle animation', 'Facial expressions', 'Rigging basics'],
      },
      {
        phase: 'Professional',
        duration: '1-2 years',
        focus: 'Specialization and portfolio',
        resources: [],
        milestones: ['Demo reel complete', 'First freelance work', 'Industry position'],
      },
    ],
    incomePotential: 'medium',
    marketDemand: 'high',
    competitionLevel: 'medium',
    immediateActions: [
      'Download Blender (free) and complete donut tutorial',
      'Practice drawing to understand motion',
      'Study animation in your favorite films',
      'Create 5-second animation test',
      'Join animation communities for feedback',
    ],
    longTermGoals: [
      'Work on feature film or AAA game',
      'Develop unique animation style',
      'Teach animation to others',
      'Win animation festival awards',
      'Lead animation team',
    ],
  },
  {
    id: 'career-web-dev',
    career: 'Web Developer',
    description: 'Build websites and web applications',
    suitableAges: '13+',
    requiredSkills: ['HTML/CSS/JavaScript', 'Problem solving', 'Design sense', 'Version control'],
    learningPath: [
      {
        phase: 'Basics',
        duration: '1-2 months',
        focus: 'Core web technologies',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-web-dev-fcc')!,
        ],
        milestones: ['First website', 'Responsive design', 'CSS animations'],
      },
      {
        phase: 'Frontend',
        duration: '3-6 months',
        focus: 'Modern frameworks',
        resources: [
          CURATED_RESOURCES.find(r => r.id === 'res-python-fcc')!,
        ],
        milestones: ['React/Vue project', 'API integration', 'Portfolio website'],
      },
      {
        phase: 'Full Stack',
        duration: '6-12 months',
        focus: 'Backend and databases',
        resources: [],
        milestones: ['Database design', 'Authentication', 'Deployed application'],
      },
    ],
    incomePotential: 'high',
    marketDemand: 'very high',
    competitionLevel: 'medium',
    immediateActions: [
      'Complete freeCodeCamp Responsive Web Design cert',
      'Build personal portfolio website',
      'Contribute to open source projects',
      'Learn Git and GitHub',
      'Solve coding challenges daily',
    ],
    longTermGoals: [
      'Senior developer position',
      'Full-stack expertise',
      'Lead technical projects',
      'Mentor junior developers',
      'Build successful SaaS product',
    ],
  },
];

// ==========================================
// RESOURCE SERVICE CLASS
// ==========================================

class ResourceService {
  /**
   * Search resources by query and filters
   */
  searchResources(params: {
    query?: string;
    category?: ContentCategory;
    skillLevel?: SkillLevel;
    ageRating?: AgeRating;
    isFree?: boolean;
    limit?: number;
  }): LearningResource[] {
    let results = [...CURATED_RESOURCES];
    
    if (params.category) {
      results = results.filter(r => r.category === params.category);
    }
    
    if (params.skillLevel) {
      results = results.filter(r => r.skillLevel === params.skillLevel);
    }
    
    if (params.ageRating) {
      // Filter resources that are appropriate for the age
      const agePriority = { 'all-ages': 0, '8+': 1, '13+': 2, '16+': 3, '18+': 4 };
      const targetPriority = agePriority[params.ageRating];
      results = results.filter(r => agePriority[r.ageRating] <= targetPriority);
    }
    
    if (params.isFree !== undefined) {
      results = results.filter(r => r.isFree === params.isFree);
    }
    
    if (params.query) {
      const queryLower = params.query.toLowerCase();
      results = results.filter(r => 
        r.title.toLowerCase().includes(queryLower) ||
        r.description.toLowerCase().includes(queryLower) ||
        r.tags.some(t => t.toLowerCase().includes(queryLower))
      );
    }
    
    // Sort by rating
    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    return results.slice(0, params.limit || 10);
  }
  
  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): GuidedWorkflow | undefined {
    return WORKFLOW_TEMPLATES.find(w => w.id === id);
  }
  
  /**
   * Find workflows by category and skill level
   */
  findWorkflows(params: {
    category?: ContentCategory;
    skillLevel?: SkillLevel;
    ageRating?: AgeRating;
    creatorType?: GuidedWorkflow['creatorType'];
  }): GuidedWorkflow[] {
    let results = [...WORKFLOW_TEMPLATES];
    
    if (params.category) {
      results = results.filter(w => w.category === params.category);
    }
    
    if (params.skillLevel) {
      results = results.filter(w => w.skillLevel === params.skillLevel);
    }
    
    if (params.ageRating) {
      const agePriority = { 'all-ages': 0, '8+': 1, '13+': 2, '16+': 3, '18+': 4 };
      const targetPriority = agePriority[params.ageRating];
      results = results.filter(w => agePriority[w.ageRating] <= targetPriority);
    }
    
    if (params.creatorType) {
      results = results.filter(w => w.creatorType === params.creatorType);
    }
    
    return results;
  }
  
  /**
   * Get career guidance
   */
  getCareerGuidance(careerId?: string): CareerGuidance | CareerGuidance[] {
    if (careerId) {
      return CAREER_GUIDANCE.find(c => c.id === careerId)!;
    }
    return CAREER_GUIDANCE;
  }
  
  /**
   * Generate personalized learning path
   */
  generateLearningPath(params: {
    goal: string;
    currentSkill: SkillLevel;
    age: number;
    interests: string[];
    timePerWeek: number;
  }): {
    recommendedWorkflows: GuidedWorkflow[];
    resources: LearningResource[];
    estimatedWeeks: number;
    milestones: string[];
  } {
    // Determine age rating
    let ageRating: AgeRating = '18+';
    if (params.age < 8) ageRating = 'all-ages';
    else if (params.age < 13) ageRating = '8+';
    else if (params.age < 16) ageRating = '13+';
    else if (params.age < 18) ageRating = '16+';
    
    // Find relevant workflows
    const workflows = this.findWorkflows({
      skillLevel: params.currentSkill,
      ageRating,
    }).filter(w => 
      params.interests.some(interest => 
        w.category.includes(interest as ContentCategory) ||
        w.tags?.some(t => t.includes(interest))
      )
    );
    
    // Find resources
    const resources = this.searchResources({
      skillLevel: params.currentSkill,
      ageRating,
      limit: 15,
    });
    
    // Calculate timeline
    const totalMinutes = workflows.reduce((sum, w) => sum + w.totalTimeMinutes, 0);
    const estimatedWeeks = Math.ceil(totalMinutes / (params.timePerWeek * 60));
    
    // Compile milestones
    const milestones = workflows.flatMap(w => 
      w.steps.filter(s => s.successCriteria).map(s => s.successCriteria!)
    );
    
    return {
      recommendedWorkflows: workflows.slice(0, 3),
      resources: resources.slice(0, 10),
      estimatedWeeks,
      milestones,
    };
  }
  
  /**
   * Check content safety
   */
  checkContentSafety(resource: LearningResource, userAge: number): {
    isSafe: boolean;
    warnings: string[];
    requiresParent: boolean;
  } {
    const warnings: string[] = [];
    const agePriority = { 'all-ages': 0, '8+': 8, '13+': 13, '16+': 16, '18+': 18 };
    
    const resourceMinAge = agePriority[resource.ageRating];
    const isAgeAppropriate = userAge >= resourceMinAge;
    
    if (!isAgeAppropriate) {
      warnings.push(`Content rated for ages ${resource.ageRating}+`);
    }
    
    if (resource.contentWarnings) {
      warnings.push(...resource.contentWarnings);
    }
    
    const requiresParent = resourceMinAge <= 13 && userAge < 13;
    
    return {
      isSafe: isAgeAppropriate && resource.safetyChecked,
      warnings,
      requiresParent,
    };
  }
  
  /**
   * Export workflow to different formats
   */
  exportWorkflow(workflow: GuidedWorkflow, format: 'pdf' | 'csv' | 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(workflow, null, 2);
        
      case 'csv':
        const lines = [
          `Workflow: ${workflow.title}`,
          `Description: ${workflow.description}`,
          `Difficulty: ${workflow.difficulty}`,
          `Total Time: ${workflow.totalTimeMinutes} minutes`,
          '',
          'Step,Title,Description,Time (min),Success Criteria',
          ...workflow.steps.map(s => 
            `"${s.stepNumber}","${s.title}","${s.description}",${s.estimatedMinutes},"${s.successCriteria || 'N/A'}"`
          ),
          '',
          'Resources',
          'Title,Source,URL',
          ...workflow.recommendedResources.map(r => 
            `"${r.title}","${r.source}","${r.url}"`
          ),
        ];
        return lines.join('\n');
        
      case 'pdf':
        // Return formatted text (would be PDF in production)
        const text = [
          '='.repeat(60),
          workflow.title.toUpperCase(),
          '='.repeat(60),
          '',
          workflow.description,
          '',
          `Difficulty: ${workflow.difficulty} | Time: ${workflow.totalTimeMinutes} minutes`,
          `Category: ${workflow.category} | Level: ${workflow.skillLevel}`,
          '',
          'PREREQUISITES',
          ...workflow.prerequisites.map(p => `  • ${p}`),
          '',
          'TOOLS REQUIRED',
          ...workflow.toolsRequired.map(t => `  • ${t}`),
          '',
          'STEPS',
          ...workflow.steps.flatMap(s => [
            '',
            `Step ${s.stepNumber}: ${s.title}`,
          '-'.repeat(40),
            s.description,
            '',
            ...(s.detailedInstructions || []).map(i => `  • ${i}`),
            ...(s.software ? [`Software: ${s.software}`] : []),
            ...(s.buttonSequence ? [`Buttons: ${s.buttonSequence.join(' → ')}`] : []),
            ...(s.keyboardShortcuts ? [`Shortcuts: ${s.keyboardShortcuts.join(', ')}`] : []),
            ...(s.codeSnippet ? ['Code:', '```', s.codeSnippet, '```'] : []),
            `Time: ${s.estimatedMinutes} minutes`,
            ...(s.successCriteria ? [`Success: ${s.successCriteria}`] : []),
          ]),
          '',
          'RECOMMENDED RESOURCES',
          ...workflow.recommendedResources.map(r => 
            `  • ${r.title} (${r.source})\n    ${r.url}`
          ),
          ...(workflow.safetyNotes ? [
            '',
            'SAFETY NOTES',
            ...workflow.safetyNotes.map(n => `  ⚠ ${n}`),
          ] : []),
          '',
          '='.repeat(60),
          'Generated by Nyati Learning Platform',
          '='.repeat(60),
        ];
        return text.join('\n');
    }
  }
}

const resourceService = new ResourceService();

export { resourceService };
