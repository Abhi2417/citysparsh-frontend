import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { officerGuard } from './officer-guard';

describe('officerGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => officerGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
