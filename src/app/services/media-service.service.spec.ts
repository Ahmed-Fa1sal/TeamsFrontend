
import { TestBed } from '@angular/core/testing';

import { MediaServiceService } from './media-service.service';
declare function describe(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function it(name: string, fn: () => void): void;
declare function expect(actual: any): { toBeTruthy(): void };

describe('MediaServiceService', () => {
  let service: MediaServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
