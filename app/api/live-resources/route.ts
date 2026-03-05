import { NextResponse } from 'next/server';
import { 
  fetchLiveResources, 
  fetchYouTubeResources, 
  fetchWebTutorials,
  selectResourcesForStep,
  searchLiveResources,
  setLiveResourceConfig,
  getLiveResourceConfig,
  type YouTubeVideo,
  type WebTutorial,
  type ContentCategory,
  type SkillLevel,
  type AgeRating,
} from '@/lib/live-resources';
import { resourceService } from '@/lib/learning-platform';
import { getObservabilityData } from '@/lib/observability';

/**
 * Live Resource API Routes
 * 
 * GET  /api/live-resources              - Search/fetch resources
 * POST /api/live-resources              - Fetch with body params
 * GET  /api/live-resources/workflow     - Get workflow with live resources
 * POST /api/live-resources/config      - Update configuration
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';
    
    // Search live resources (from Qdrant embeddings)
    if (action === 'search') {
      const query = url.searchParams.get('q') || '';
      const category = url.searchParams.get('category') as ContentCategory | undefined;
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      const results = await searchLiveResources(query, category, limit);
      
      return NextResponse.json({
        success: true,
        data: {
          query,
          results,
          count: results.length,
        },
      });
    }
    
    // Get configuration
    if (action === 'config') {
      const config = getLiveResourceConfig();
      return NextResponse.json({
        success: true,
        data: { config },
      });
    }
    
    // Fetch fresh resources from APIs
    if (action === 'fetch') {
      const query = url.searchParams.get('q');
      const category = url.searchParams.get('category') as ContentCategory;
      const skillLevel = url.searchParams.get('level') as SkillLevel || 'beginner';
      const ageRating = url.searchParams.get('age') as AgeRating || '13+';
      
      if (!query || !category) {
        return NextResponse.json(
          { success: false, error: 'Missing query or category' },
          { status: 400 }
        );
      }
      
      const result = await fetchLiveResources(query, {
        category,
        skillLevel,
        ageRating,
      });
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    // Get workflow with live resources
    if (action === 'workflow') {
      const workflowId = url.searchParams.get('id');
      
      if (!workflowId) {
        return NextResponse.json(
          { success: false, error: 'Missing workflow ID' },
          { status: 400 }
        );
      }
      
      const workflow = resourceService.getWorkflow(workflowId);
      
      if (!workflow) {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 404 }
        );
      }
      
      // Fetch live resources for this workflow
      const liveResources = await fetchLiveResources(workflow.title, {
        category: workflow.category,
        skillLevel: workflow.skillLevel,
        ageRating: workflow.ageRating,
      });
      
      // Enhance workflow steps with live resources
      const enhancedSteps = await Promise.all(
        workflow.steps.map(async (step) => {
          const stepResources = await selectResourcesForStep(
            step,
            workflow,
            liveResources.youtubeVideos,
            liveResources.webTutorials
          );
          
          return {
            ...step,
            liveResources: stepResources.resources,
            aiRecommendation: stepResources.aiRecommendation,
            estimatedTotalTime: stepResources.estimatedCompletionTime,
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        data: {
          workflow: {
            ...workflow,
            steps: enhancedSteps,
          },
          liveResources: {
            videos: liveResources.youtubeVideos,
            tutorials: liveResources.webTutorials,
            freshness: liveResources.freshness,
            fetchedAt: liveResources.fetchedAt,
          },
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Live resources API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;
    
    // Fetch resources with full body parameters
    if (action === 'fetch') {
      const { query, category, skillLevel, ageRating, maxResults } = body;
      
      if (!query || !category) {
        return NextResponse.json(
          { success: false, error: 'Missing query or category' },
          { status: 400 }
        );
      }
      
      const result = await fetchLiveResources(query, {
        category,
        skillLevel: skillLevel || 'beginner',
        ageRating: ageRating || '13+',
        maxResults,
      });
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }
    
    // Update configuration
    if (action === 'update-config') {
      const { config } = body;
      
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Missing config' },
          { status: 400 }
        );
      }
      
      setLiveResourceConfig(config);
      
      return NextResponse.json({
        success: true,
        data: { config: getLiveResourceConfig() },
        message: 'Configuration updated',
      });
    }
    
    // Select resources for a specific workflow step
    if (action === 'select-resources') {
      const { workflowId, stepNumber, videos, tutorials } = body;
      
      if (!workflowId || stepNumber === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing workflowId or stepNumber' },
          { status: 400 }
        );
      }
      
      const workflow = resourceService.getWorkflow(workflowId);
      
      if (!workflow) {
        return NextResponse.json(
          { success: false, error: 'Workflow not found' },
          { status: 404 }
        );
      }
      
      const step = workflow.steps.find(s => s.stepNumber === stepNumber);
      
      if (!step) {
        return NextResponse.json(
          { success: false, error: 'Step not found' },
          { status: 404 }
        );
      }
      
      const selected = await selectResourcesForStep(
        step,
        workflow,
        videos || [],
        tutorials || []
      );
      
      return NextResponse.json({
        success: true,
        data: selected,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Live resources POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
