import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { LegacyAnalysisResult } from './types/document-intelligence.types';

export interface CacheEntry {
  hash: string;
  result: LegacyAnalysisResult;
  timestamp: Date;
}

@Injectable()
export class DocumentCacheService {
  private readonly logger = new Logger(DocumentCacheService.name);
  
  // Using an in-memory map for the cache layer. In a distributed environment, 
  // this should be backed by Redis or a database.
  private readonly cache = new Map<string, CacheEntry>();

  generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async get(hash: string): Promise<LegacyAnalysisResult | null> {
    const entry = this.cache.get(hash);
    if (!entry) {
      return null;
    }
    
    // Check if cache is older than 24 hours (optional expiration logic)
    const ageMs = Date.now() - entry.timestamp.getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      this.cache.delete(hash);
      return null;
    }
    
    this.logger.log(`[CACHE HIT] Returning cached analysis for hash ${hash}`);
    return entry.result;
  }

  async set(hash: string, result: LegacyAnalysisResult): Promise<void> {
    this.cache.set(hash, {
      hash,
      result,
      timestamp: new Date(),
    });
    this.logger.log(`[CACHE SET] Cached analysis for hash ${hash}`);
  }
}
