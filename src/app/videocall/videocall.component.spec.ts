import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideocallComponent } from './videocall.component';

// Provide minimal declarations for test globals so TypeScript compilation succeeds
declare function describe(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function it(name: string, fn: () => void): void;
declare function expect(actual: any): { toBeTruthy(): void };

describe('VideocallComponent', () => {
  let component: VideocallComponent;
  let fixture: ComponentFixture<VideocallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideocallComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideocallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});