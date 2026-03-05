/**
 * Security & Anti-Leak Module for Nyati Learning Platform
 * 
 * Comprehensive security layer providing:
 * - Input sanitization & content filtering
 * - API key & secret protection
 * - Output filtering & leak prevention
 * - Safe mode integration with governance
 * - Rate limiting & abuse prevention
 * - Resource safety validation
 * - Secure export filtering
 * - Security monitoring & alerting
 * 
 * All security checks are non-blocking where possible to maintain performance,
 * but will trigger Safe Mode for serious threats.
 */

import { enterSafeMode, getSafeModeStatus, type SystemMode } from './production-governance';
import type { ActionTrace } from './production-governance';

// ==========================================
// SECURITY CONFIGURATION
// ==========================================

export interface SecurityConfig {
  // Input filtering
  maxInputLength: number;
  allowedUnicodeRanges: [number, number][];
  forbiddenPatterns: RegExp[];
  
  // Output filtering
  secretPatterns: RegExp[];
  maxOutputLength: number;
  
  // Rate limiting
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  blockDurationMinutes: number;
  
  // Resource validation
  allowedDomains: string[];
  blockedDomains: string[];
  requireHttps: boolean;
  
  // Safe mode triggers
  autoSafeModeTriggers: string[];
  suspiciousThreshold: number;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxInputLength: 10000,
  allowedUnicodeRanges: [
    [0x0000, 0x007F], // Basic Latin
    [0x0080, 0x00FF], // Latin-1 Supplement
    [0x0100, 0x017F], // Latin Extended-A
    [0x0180, 0x024F], // Latin Extended-B
    [0x0370, 0x03FF], // Greek and Coptic
    [0x0400, 0x04FF], // Cyrillic
    [0x2000, 0x206F], // General Punctuation
    [0x2070, 0x209F], // Superscripts and Subscripts
    [0x20A0, 0x20CF], // Currency Symbols
    [0x2100, 0x214F], // Letterlike Symbols
    [0x2150, 0x218F], // Number Forms
    [0x2190, 0x21FF], // Arrows
    [0x2200, 0x22FF], // Mathematical Operators
    [0x2300, 0x23FF], // Miscellaneous Technical
    [0x25A0, 0x25FF], // Geometric Shapes
    [0x2600, 0x26FF], // Miscellaneous Symbols
  ],
  forbiddenPatterns: [
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /<iframe[^>]*>.*?<\/iframe>/gi, // Iframes
    /<object[^>]*>.*?<\/object>/gi, // Objects
    /<embed[^>]*>.*?<\/embed>/gi, // Embeds
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /data:text\/html/gi, // Data URIs
    /eval\s*\(/gi, // Eval
    /document\.write/gi, // Document write
    /window\./gi, // Window access
    /localStorage/gi, // Local storage access
    /sessionStorage/gi, // Session storage access
    /fetch\s*\(/gi, // Fetch API
    /XMLHttpRequest/gi, // XHR
  ],
  secretPatterns: [
    /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9_-]{16,}['"]?/gi,
    /api[_-]?secret\s*[:=]\s*['"]?[a-zA-Z0-9_-]{16,}['"]?/gi,
    /auth[_-]?token\s*[:=]\s*['"]?[a-zA-Z0-9_-]{16,}['"]?/gi,
    /bearer\s+[a-zA-Z0-9_-]{20,}/gi,
    /sk-[a-zA-Z0-9]{20,}/gi, // OpenAI-style keys
    /sk_live_[a-zA-Z0-9]{20,}/gi, // Stripe-style keys
    /sk_test_[a-zA-Z0-9]{20,}/gi,
    /password\s*[:=]\s*['"]?[^'"\s]{8,}['"]?/gi,
    /private[_-]?key/gi,
    /secret[_-]?key/gi,
    /access[_-]?token/gi,
    /refresh[_-]?token/gi,
    /aws[_-]?access[_-]?key[_-]?id/gi,
    /aws[_-]?secret[_-]?access[_-]?key/gi,
    /firebase[_-]?api[_-]?key/gi,
    /github[_-]?token/gi,
    /gcp[_-]?api[_-]?key/gi,
    /azure[_-]?key/gi,
    /database[_-]?url/gi,
    /mongodb[_-]?uri/gi,
    /postgres[_-]?url/gi,
    /mysql[_-]?password/gi,
    /redis[_-]?password/gi,
    /jwt[_-]?secret/gi,
    /encryption[_-]?key/gi,
    /signing[_-]?key/gi,
    /webhook[_-]?secret/gi,
    /oauth[_-]?secret/gi,
    /client[_-]?secret/gi,
  ],
  maxOutputLength: 50000,
  maxRequestsPerMinute: 30,
  maxRequestsPerHour: 500,
  blockDurationMinutes: 60,
  allowedDomains: [
    'youtube.com',
    'youtu.be',
    'freecodecamp.org',
    'blender.org',
    'docs.blender.org',
    'unity.com',
    'learn.unity.com',
    'roblox.com',
    'create.roblox.com',
    'unrealengine.com',
    'docs.unrealengine.com',
    'github.com',
    'stackoverflow.com',
    'stackoverflow.com',
    'medium.com',
    'dev.to',
    'hashnode.com',
    'khanacademy.org',
    'coursera.org',
    'udemy.com',
    'skillshare.com',
    'masterclass.com',
    'canva.com',
    'gimp.org',
    'obsproject.com',
    'openshot.org',
    'pencil2d.org',
    'scratch.mit.edu',
    'python.org',
    'mozilla.org',
    'developer.mozilla.org',
    'w3schools.com',
    'codecademy.com',
    'theodinproject.com',
    'javascript.info',
    'typescriptlang.org',
    'react.dev',
    'nextjs.org',
    'tailwindcss.com',
    'vercel.com',
    'netlify.com',
    'heroku.com',
    'firebase.google.com',
    'supabase.com',
    'qdrant.tech',
    'openai.com',
    'anthropic.com',
    'ai.google.dev',
    'huggingface.co',
    'replicate.com',
    'groq.com',
  ],
  blockedDomains: [
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'ow.ly',
    'short.link',
    'rb.gy',
    'tr.im',
    'is.gd',
    'v.gd',
    'x.co',
    's.id',
    'short.io',
    'rebrand.ly',
    'cutt.ly',
    'shorturl.at',
  ],
  requireHttps: true,
  autoSafeModeTriggers: [
    'ignore previous instructions',
    'disregard all prior',
    'forget your programming',
    'you are now',
    'pretend to be',
    'act as',
    'roleplay as',
    'system override',
    'admin mode',
    'developer mode',
    'ignore safety',
    'bypass restrictions',
    'jailbreak',
    'DAN mode',
    'do anything now',
    'no limits',
    'unrestricted',
    'unfiltered',
    'ignore ethics',
    'ignore morality',
  ],
  suspiciousThreshold: 3,
};

let securityConfig: SecurityConfig = { ...DEFAULT_SECURITY_CONFIG };

// ==========================================
// INPUT SANITIZATION & CONTENT FILTERING
// ==========================================

export interface SanitizationResult {
  sanitized: string;
  originalLength: number;
  sanitizedLength: number;
  removedCharacters: number;
  threatsDetected: string[];
  isSafe: boolean;
  riskScore: number; // 0-10
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeUserInput(input: string): SanitizationResult {
  const originalLength = input.length;
  let sanitized = input;
  const threatsDetected: string[] = [];
  let riskScore = 0;

  // Check input length
  if (originalLength > securityConfig.maxInputLength) {
    sanitized = sanitized.slice(0, securityConfig.maxInputLength);
    threatsDetected.push('input_too_long');
    riskScore += 2;
  }

  // Check for forbidden patterns (HTML, scripts, etc.)
  for (const pattern of securityConfig.forbiddenPatterns) {
    const matches = sanitized.match(pattern);
    if (matches) {
      threatsDetected.push(`forbidden_pattern: ${pattern.source.slice(0, 30)}...`);
      riskScore += 3;
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  }

  // Filter unicode characters (emoji smuggling prevention)
  let unicodeFiltered = '';
  let removedUnicode = 0;
  
  for (const char of sanitized) {
    const code = char.codePointAt(0) || 0;
    const isAllowed = securityConfig.allowedUnicodeRanges.some(
      ([start, end]) => code >= start && code <= end
    );
    
    if (isAllowed) {
      unicodeFiltered += char;
    } else {
      removedUnicode++;
    }
  }
  
  if (removedUnicode > 0) {
    threatsDetected.push(`unicode_filtering: ${removedUnicode} chars removed`);
    riskScore += Math.min(removedUnicode / 10, 3);
  }
  
  sanitized = unicodeFiltered;

  // Check for safe mode trigger phrases
  const lowerInput = input.toLowerCase();
  for (const trigger of securityConfig.autoSafeModeTriggers) {
    if (lowerInput.includes(trigger.toLowerCase())) {
      threatsDetected.push(`safe_mode_trigger: ${trigger}`);
      riskScore += 5;
    }
  }

  // Check for excessive repetition (possible DoS)
  const repetitionScore = calculateRepetitionScore(sanitized);
  if (repetitionScore > 0.8) {
    threatsDetected.push('excessive_repetition');
    riskScore += 2;
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return {
    sanitized,
    originalLength,
    sanitizedLength: sanitized.length,
    removedCharacters: originalLength - sanitized.length,
    threatsDetected,
    isSafe: riskScore < securityConfig.suspiciousThreshold,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * Calculate repetition score for DoS detection
 */
function calculateRepetitionScore(input: string): number {
  if (input.length < 100) return 0;
  
  const chunks: string[] = [];
  const chunkSize = 10;
  
  for (let i = 0; i < input.length - chunkSize; i += chunkSize) {
    chunks.push(input.slice(i, i + chunkSize));
  }
  
  const uniqueChunks = new Set(chunks);
  return 1 - (uniqueChunks.size / chunks.length);
}

// ==========================================
// API KEY & SECRET PROTECTION
// ==========================================

export interface SecretScanResult {
  containsSecrets: boolean;
  secretsFound: Array<{
    type: string;
    pattern: string;
    position: number;
    redacted: string;
  }>;
  redactedText: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Scan text for secrets and API keys
 */
export function scanForSecrets(text: string): SecretScanResult {
  const secretsFound: SecretScanResult['secretsFound'] = [];
  let redactedText = text;
  let totalRisk = 0;

  for (const pattern of securityConfig.secretPatterns) {
    const matches = [...text.matchAll(pattern)];
    
    for (const match of matches) {
      const secretType = inferSecretType(pattern.source);
      const redacted = `[${secretType.toUpperCase()}_REDACTED]`;
      
      secretsFound.push({
        type: secretType,
        pattern: pattern.source.slice(0, 50),
        position: match.index || 0,
        redacted,
      });
      
      // Replace in redacted text
      redactedText = redactedText.replace(match[0], redacted);
      totalRisk += 3;
    }
  }

  let riskLevel: SecretScanResult['riskLevel'] = 'low';
  if (totalRisk >= 10) riskLevel = 'critical';
  else if (totalRisk >= 6) riskLevel = 'high';
  else if (totalRisk >= 3) riskLevel = 'medium';

  return {
    containsSecrets: secretsFound.length > 0,
    secretsFound,
    redactedText,
    riskLevel,
  };
}

/**
 * Infer secret type from pattern
 */
function inferSecretType(pattern: string): string {
  if (pattern.includes('api')) return 'api_key';
  if (pattern.includes('secret')) return 'secret';
  if (pattern.includes('token')) return 'token';
  if (pattern.includes('password')) return 'password';
  if (pattern.includes('key')) return 'key';
  if (pattern.includes('auth')) return 'auth_token';
  return 'sensitive_data';
}

/**
 * Check if text contains secrets (quick check)
 */
export function containsSecrets(text: string): boolean {
  return securityConfig.secretPatterns.some(pattern => pattern.test(text));
}

// ==========================================
// OUTPUT FILTERING & LEAK PREVENTION
// ==========================================

export interface OutputFilterResult {
  filtered: string;
  leaksPrevented: string[];
  modifications: number;
  isSafe: boolean;
}

/**
 * Filter output to prevent data leaks
 */
export function preventLeaks(output: string): OutputFilterResult {
  const leaksPrevented: string[] = [];
  let filtered = output;
  let modifications = 0;

  // Scan for secrets
  const secretScan = scanForSecrets(filtered);
  if (secretScan.containsSecrets) {
    leaksPrevented.push(...secretScan.secretsFound.map(s => s.type));
    filtered = secretScan.redactedText;
    modifications += secretScan.secretsFound.length;
  }

  // Filter file paths
  const pathPattern = /(?:\/home\/|\/Users\/|\/var\/|C:\\|file:\/\/)[^\s\n]*/gi;
  const pathMatches = filtered.match(pathPattern);
  if (pathMatches) {
    for (const path of pathMatches) {
      filtered = filtered.replace(path, '[PATH_REDACTED]');
      leaksPrevented.push('file_path');
      modifications++;
    }
  }

  // Filter email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const emailMatches = filtered.match(emailPattern);
  if (emailMatches) {
    for (const email of emailMatches) {
      filtered = filtered.replace(email, '[EMAIL_REDACTED]');
      leaksPrevented.push('email_address');
      modifications++;
    }
  }

  // Filter IP addresses
  const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ipMatches = filtered.match(ipPattern);
  if (ipMatches) {
    for (const ip of ipMatches) {
      filtered = filtered.replace(ip, '[IP_REDACTED]');
      leaksPrevented.push('ip_address');
      modifications++;
    }
  }

  // Check output length
  if (filtered.length > securityConfig.maxOutputLength) {
    filtered = filtered.slice(0, securityConfig.maxOutputLength) + '\n[... Output truncated for security ...]';
    leaksPrevented.push('output_truncated');
  }

  return {
    filtered,
    leaksPrevented: [...new Set(leaksPrevented)],
    modifications,
    isSafe: modifications === 0,
  };
}

// ==========================================
// RATE LIMITING & ABUSE PREVENTION
// ==========================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blocked: boolean;
  blockExpires: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  blocked: boolean;
  blockDuration?: number;
  reason?: string;
}

/**
 * Check rate limit for a client
 */
export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean = false
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  // Get or create entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = {
      count: 0,
      firstRequest: now,
      lastRequest: now,
      blocked: false,
      blockExpires: 0,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if currently blocked
  if (entry.blocked) {
    if (now < entry.blockExpires) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: entry.blockExpires,
        blocked: true,
        blockDuration: Math.ceil((entry.blockExpires - now) / 60000),
        reason: 'Rate limit exceeded - temporary block in effect',
      };
    } else {
      // Block expired, reset
      entry.blocked = false;
      entry.count = 0;
      entry.firstRequest = now;
    }
  }

  // Calculate limits (authenticated users get higher limits)
  const maxPerMinute = isAuthenticated 
    ? securityConfig.maxRequestsPerMinute * 2 
    : securityConfig.maxRequestsPerMinute;
  const maxPerHour = isAuthenticated 
    ? securityConfig.maxRequestsPerHour * 2 
    : securityConfig.maxRequestsPerHour;

  // Check minute window
  const minuteAgo = now - 60000;
  if (entry.lastRequest < minuteAgo) {
    // Reset minute counter
    entry.count = 0;
    entry.firstRequest = now;
  }

  // Check hour window
  const hourAgo = now - 3600000;
  if (entry.firstRequest < hourAgo) {
    entry.count = 0;
    entry.firstRequest = now;
  }

  // Increment counter
  entry.count++;
  entry.lastRequest = now;

  // Check if limit exceeded
  if (entry.count > maxPerMinute) {
    entry.blocked = true;
    entry.blockExpires = now + (securityConfig.blockDurationMinutes * 60000);
    
    // Log security event
    logSecurityEvent('rate_limit_exceeded', identifier, {
      count: entry.count,
      limit: maxPerMinute,
    });

    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.blockExpires,
      blocked: true,
      blockDuration: securityConfig.blockDurationMinutes,
      reason: 'Too many requests - please slow down',
    };
  }

  // Check hourly limit
  if (entry.count > maxPerHour) {
    entry.blocked = true;
    entry.blockExpires = now + (securityConfig.blockDurationMinutes * 2 * 60000);
    
    logSecurityEvent('hourly_rate_limit_exceeded', identifier, {
      count: entry.count,
      limit: maxPerHour,
    });

    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: entry.blockExpires,
      blocked: true,
      blockDuration: securityConfig.blockDurationMinutes * 2,
      reason: 'Hourly request limit exceeded',
    };
  }

  return {
    allowed: true,
    remainingRequests: maxPerMinute - entry.count,
    resetTime: entry.firstRequest + 60000,
    blocked: false,
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimits(): number {
  const now = Date.now();
  const hourAgo = now - 3600000;
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.lastRequest < hourAgo && !entry.blocked) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// ==========================================
// RESOURCE SAFETY VALIDATION
// ==========================================

export interface ResourceValidationResult {
  isValid: boolean;
  isSafe: boolean;
  errors: string[];
  warnings: string[];
  normalizedUrl: string;
}

/**
 * Validate external resource URL
 */
export function validateResourceUrl(url: string): ResourceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = new URL(url);

    // Check HTTPS requirement
    if (securityConfig.requireHttps && parsed.protocol !== 'https:') {
      errors.push('URL must use HTTPS protocol');
    }

    // Check domain
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = securityConfig.allowedDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    const isBlocked = securityConfig.blockedDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isBlocked) {
      errors.push('Domain is blocked');
    } else if (!isAllowed) {
      warnings.push('Domain not in allowlist');
    }

    // Check for suspicious paths
    const suspiciousPaths = ['/admin', '/api', '/internal', '/private', '/config'];
    if (suspiciousPaths.some(p => parsed.pathname.includes(p))) {
      warnings.push('URL contains potentially sensitive path');
    }

    // Check for query parameters that might be suspicious
    const suspiciousParams = ['token', 'key', 'secret', 'password', 'auth'];
    for (const param of suspiciousParams) {
      if (parsed.searchParams.has(param)) {
        warnings.push(`URL contains sensitive query parameter: ${param}`);
      }
    }

    return {
      isValid: errors.length === 0,
      isSafe: errors.length === 0 && warnings.length === 0,
      errors,
      warnings,
      normalizedUrl: parsed.toString(),
    };
  } catch (e) {
    errors.push('Invalid URL format');
    return {
      isValid: false,
      isSafe: false,
      errors,
      warnings,
      normalizedUrl: url,
    };
  }
}

// ==========================================
// SECURITY MONITORING & EVENT LOGGING
// ==========================================

export interface SecurityEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, unknown>;
  action: string;
  resolved: boolean;
}

const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000;

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: string,
  source: string,
  details: Record<string, unknown>,
  severity: SecurityEvent['severity'] = 'medium'
): SecurityEvent {
  const event: SecurityEvent = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    type,
    severity,
    source,
    details,
    action: 'logged',
    resolved: false,
  };

  // Add to event log
  securityEvents.unshift(event);
  
  // Trim old events
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.length = MAX_SECURITY_EVENTS;
  }

  // Log to console for immediate visibility
  console.warn(`🛡️ SECURITY EVENT [${severity.toUpperCase()}]: ${type}`, {
    source,
    details,
    eventId: event.id,
  });

  // Trigger safe mode for critical events
  if (severity === 'critical') {
    enterSafeMode(`Security event: ${type}`, 'critical');
    event.action = 'safe_mode_triggered';
  }

  return event;
}

/**
 * Get security events
 */
export function getSecurityEvents(
  filters?: {
    severity?: SecurityEvent['severity'];
    type?: string;
    since?: number;
    resolved?: boolean;
  }
): SecurityEvent[] {
  let filtered = [...securityEvents];

  if (filters?.severity) {
    filtered = filtered.filter(e => e.severity === filters.severity);
  }

  if (filters?.type) {
    filtered = filtered.filter(e => e.type === filters.type);
  }

  if (filters?.since) {
    filtered = filtered.filter(e => e.timestamp >= filters.since!);
  }

  if (filters?.resolved !== undefined) {
    filtered = filtered.filter(e => e.resolved === filters.resolved);
  }

  return filtered;
}

/**
 * Get security statistics
 */
export function getSecurityStats(): {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
  recentCriticalEvents: number;
  activeBlocks: number;
} {
  const eventsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const eventsByType: Record<string, number> = {};

  for (const event of securityEvents) {
    eventsBySeverity[event.severity]++;
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
  }

  const hourAgo = Date.now() - 3600000;
  const recentCriticalEvents = securityEvents.filter(
    e => e.severity === 'critical' && e.timestamp > hourAgo
  ).length;

  const activeBlocks = [...rateLimitStore.values()].filter(e => e.blocked).length;

  return {
    totalEvents: securityEvents.length,
    eventsBySeverity,
    eventsByType,
    recentCriticalEvents,
    activeBlocks,
  };
}

// ==========================================
// COMPREHENSIVE SECURITY CHECK
// ==========================================

export interface SecurityCheckResult {
  passed: boolean;
  inputCheck: SanitizationResult;
  rateLimitCheck: RateLimitResult;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'safe_mode';
  message: string;
}

/**
 * Perform comprehensive security check on input
 */
export function performSecurityCheck(
  input: string,
  clientId: string,
  isAuthenticated: boolean = false
): SecurityCheckResult {
  // Step 1: Rate limiting
  const rateLimit = checkRateLimit(clientId, isAuthenticated);
  if (!rateLimit.allowed) {
    return {
      passed: false,
      inputCheck: sanitizeUserInput(input),
      rateLimitCheck: rateLimit,
      threatLevel: 'medium',
      action: 'block',
      message: rateLimit.reason || 'Rate limit exceeded',
    };
  }

  // Step 2: Input sanitization
  const inputCheck = sanitizeUserInput(input);
  
  // Determine threat level
  let threatLevel: SecurityCheckResult['threatLevel'] = 'none';
  if (inputCheck.riskScore >= 8) threatLevel = 'critical';
  else if (inputCheck.riskScore >= 6) threatLevel = 'high';
  else if (inputCheck.riskScore >= 3) threatLevel = 'medium';
  else if (inputCheck.riskScore > 0) threatLevel = 'low';

  // Determine action
  let action: SecurityCheckResult['action'] = 'allow';
  let message = 'Security check passed';

  if (!inputCheck.isSafe) {
    if (inputCheck.riskScore >= 8) {
      action = 'safe_mode';
      message = 'Critical security threats detected - entering safe mode';
      enterSafeMode('Input sanitization detected critical threats', 'critical');
      
      logSecurityEvent('critical_input_detected', clientId, {
        threats: inputCheck.threatsDetected,
        riskScore: inputCheck.riskScore,
      }, 'critical');
    } else if (inputCheck.riskScore >= 5) {
      action = 'block';
      message = 'Suspicious input blocked';
      
      logSecurityEvent('suspicious_input_blocked', clientId, {
        threats: inputCheck.threatsDetected,
        riskScore: inputCheck.riskScore,
      }, 'high');
    } else {
      action = 'warn';
      message = 'Input sanitized - proceeding with caution';
      
      logSecurityEvent('input_sanitized', clientId, {
        threats: inputCheck.threatsDetected,
        riskScore: inputCheck.riskScore,
      }, 'low');
    }
  }

  return {
    passed: action === 'allow' || action === 'warn',
    inputCheck,
    rateLimitCheck: rateLimit,
    threatLevel,
    action,
    message,
  };
}

// ==========================================
// CONFIGURATION
// ==========================================

export function setSecurityConfig(newConfig: Partial<SecurityConfig>): void {
  securityConfig = { ...securityConfig, ...newConfig };
  console.log('🛡️ Security configuration updated');
}

export function getSecurityConfig(): SecurityConfig {
  return { ...securityConfig };
}
