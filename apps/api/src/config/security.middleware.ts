import { Request, Response, NextFunction } from 'express';

// Simple NoSQL Injection Sanitizer
export function noSqlInjectionSanitizer(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
}

// Simple XSS Sanitizer
export function xssSanitizer(req: Request, res: Response, next: NextFunction) {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  const sanitize = (obj: any): any => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  // Only sanitize body to avoid breaking URLs
  req.body = sanitize(req.body);
  next();
}
