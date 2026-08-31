import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CitizenComponent, Priority } from './citizen';

describe('CitizenComponent', () => {
  let component: CitizenComponent;
  let fixture: ComponentFixture<CitizenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitizenComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CitizenComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.form.title).toBe('');
    expect(component.form.description).toBe('');
    expect(component.form.priority).toBe(Priority.Low);
    expect(component.form.fileName).toBe('');
  });

  it('should not submit when form is invalid', () => {
    component.form.title = '';
    component.form.description = '';
    component.submitComplaint();
    expect(component.submitted).toBeTrue();
    expect(component.complaints.length).toBe(0);
  });

  it('should submit when form is valid', () => {
    component.form.title = 'Test Title';
    component.form.description = 'Test Description';
    component.form.priority = Priority.High;
    component.submitComplaint();
    expect(component.complaints.length).toBe(1);
    expect(component.complaints[0].title).toBe('Test Title');
    expect(component.complaints[0].priority).toBe(Priority.High);
  });

  it('should reset form after calling resetForm()', () => {
    component.form.title = 'Some Title';
    component.form.description = 'Some Description';
    component.resetForm();
    expect(component.form.title).toBe('');
    expect(component.form.description).toBe('');
    expect(component.submitted).toBeFalse();
  });

  it('should delete a complaint by index', () => {
    component.complaints = [
      { title: 'A', description: 'Desc A', priority: Priority.Low },
      { title: 'B', description: 'Desc B', priority: Priority.High },
    ];
    component.deleteComplaint(0);
    expect(component.complaints.length).toBe(1);
    expect(component.complaints[0].title).toBe('B');
  });

  it('should toggle active view', () => {
    component.toggleView('list');
    expect(component.activeView).toBe('list');
    component.toggleView('form');
    expect(component.activeView).toBe('form');
  });

  it('should set isDragging on drag events', () => {
    const mockEvent = { preventDefault: jasmine.createSpy() } as unknown as DragEvent;
    component.onDragOver(mockEvent);
    expect(component.isDragging).toBeTrue();
    component.onDragLeave(mockEvent);
    expect(component.isDragging).toBeFalse();
  });

  it('should remove file', () => {
    component.form.fileName = 'test.pdf';
    const mockEvent = { stopPropagation: jasmine.createSpy() } as unknown as Event;
    component.removeFile(mockEvent);
    expect(component.form.fileName).toBe('');
    expect(component.form.file).toBeUndefined();
  });
});
