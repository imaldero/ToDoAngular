import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { pexelsApiResponse } from 'src/app/MockData/pexels-api-response';
import { TodoModel } from 'src/app/Models/todo.model';
import { Pexels } from '../interfaces/pexels';
import { SrcAlt } from '../interfaces/src-alt';
import { Todo } from '../interfaces/todo';
import { ImageService } from '../services/image.service';
import { TodoService } from '../services/todo.service';
import { FormComponent } from './form.component';

// Image Service Stub
class ImageServiceStub {
  mockPexelsResponse: Pexels = pexelsApiResponse;
  fetchImages(query: string): Observable<Pexels> {
    return of(this.mockPexelsResponse);
  }

  updateState(data: string): void {}
}

// Todo Service Stub
class TodoServiceStub {
  private tabIndex: Subject<number> = new Subject<number>();
  private todoSubject: Subject<Todo[]> = new Subject<Todo[]>();
  private mockTodos: Todo[] = [
    {
      name: 'testTodo',
      note: 'note',
      imgSrc: {
        src: 'image.url',
        alt: 'something',
      },
    },
  ];

  editTodo(todo: Todo, id: number): void {
    this.mockTodos[id] = todo;
    this.todoSubject.next(this.mockTodos);
  }

  saveTodo(todo: Todo): void {
    this.mockTodos.push(todo);
    this.todoSubject.next(this.mockTodos);
    this.tabIndex.next(0);
  }
}

describe('FormComponent', (): void => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let imageService: ImageService;
  let todoService: TodoService;
  let router: Router;
  let mockFormGroupDirective: FormGroupDirective;
  const mockPexelsResponse: Pexels = pexelsApiResponse;
  const dialogRefSpy: jasmine.SpyObj<void> = jasmine.createSpyObj(
    'MatDialogRef',
    ['close']
  );
  const newTodo: TodoModel = new TodoModel(`test`, `test`, `test`, `test`);
  let mockFormData: object = {
    name: 'test',
    note: 'test',
    imgSrc: `test`,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        HttpClientTestingModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        BrowserAnimationsModule,
      ],
      declarations: [FormComponent],
      providers: [
        { provide: ImageService, useClass: ImageServiceStub },
        { provide: TodoService, useClass: TodoServiceStub },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    imageService = TestBed.inject(ImageService);
    todoService = TestBed.inject(TodoService);
    router = TestBed.inject(Router);
    mockFormGroupDirective = jasmine.createSpyObj('FormGroupDirective', [
      'resetForm',
    ]);
    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should test ngOnInit if edit todo with image', (): void => {
    const todo: Todo = newTodo.getTodo;
    component.editInfo = { id: 0, todo };
    component.ngOnInit();
    expect(component.todoForm).toBeInstanceOf(FormGroup);
    expect(component.todoForm.value).toEqual({
      name: `test`,
      note: `test`,
      imgSrc: '',
    });
    expect(component.todoId).toBe(0);
    expect(component.curSelectedImage).toEqual({ src: `test`, alt: `test` });
  });

  it('should test ngOnInit if not in edit mode', (): void => {
    component.ngOnInit();
    expect(component.editInfo).toBeUndefined();
    expect(component.todoForm.value).toEqual({
      name: ``,
      note: ``,
      imgSrc: ``,
    });
  });

  it('should test selectedImage', (): void => {
    const todo: Todo = newTodo.getTodo;
    const testSrc: SrcAlt = { src: `test`, alt: `test` };
    component.editInfo = { id: 0, todo };
    component.selectedImage(testSrc);
    expect(component.curSelectedImage).toEqual(testSrc);
  });

  it('should test onSubmit if form !valid || !touched', (): void => {
    const todo: Todo = newTodo.getTodo;
    component.editInfo = { id: 0, todo };
    expect(component.fetchedImages).toEqual([]);
  });

  it('should test onSubmit if form valid && in edit mode', (): void => {
    const editTodoSpy: jasmine.Spy = spyOn(todoService, `editTodo`);
    const routerNavigateSpy: jasmine.Spy = spyOn(router, `navigate`);
    const todo: Todo = newTodo.getTodo;
    component.editInfo = { id: 0, todo };
    component.ngOnInit();
    component.todoForm.setValue(mockFormData);
    expect(component.todoForm.status).toBe('VALID');
    component.onSubmit(mockFormGroupDirective);
    expect(editTodoSpy).toHaveBeenCalled();
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/']);
    expect(mockFormGroupDirective.resetForm).toHaveBeenCalled();
    expect(component.fetchedImages).toEqual([]);
  });

  it('should test onSubmit if form valid && not in edit mode', (): void => {
    const saveTodoSpy: jasmine.Spy = spyOn(todoService, `saveTodo`);
    component.ngOnInit();
    component.todoForm.setValue(mockFormData);
    expect(component.todoForm.status).toBe('VALID');
    component.onSubmit(mockFormGroupDirective);
    let formValue = component.todoForm.value;
    formValue.imgSrc = undefined;
    expect(saveTodoSpy).toHaveBeenCalledWith(formValue);
    expect(mockFormGroupDirective.resetForm).toHaveBeenCalled();
    expect(component.fetchedImages).toEqual([]);
    expect(component.showSearch).toBe(false);
  });

  it('form should be invalid if empty', (): void => {
    expect(component.todoForm.status).toEqual('INVALID');
  });

  it('should test onSearchImage method if query is empty', (): void => {
    component.onSearchImage(``);
    expect(component.imgFormField.nativeElement.classList).toContain(
      'mat-form-field-invalid'
    );
    expect(component.imageNotFound).toBe(`Can't search for nothing silly ;)`);
    expect(component.loadingSpinner).toBe(false);
  });

  it('should test onSearchImage method if no images found', (): void => {
    const updateStateSpy: jasmine.Spy = spyOn(component, `updateState`);
    spyOn(imageService, `fetchImages`).and.returnValue(
      of({
        page: 1,
        per_page: 12,
        photos: [],
        total_results: 0,
        next_page: '',
      })
    );
    component.onSearchImage(`somegibberish`);
    expect(component.imgFormField.nativeElement.classList).toContain(
      'mat-form-field-invalid'
    );
    expect(component.imageNotFound).toBe(
      `No pictures found matching that search :(`
    );
    expect(component.fetchedImages).toEqual([]);
    expect(updateStateSpy).toHaveBeenCalledWith(`single`);
    expect(component.loadingSpinner).toBe(false);
    component.curSelectedImage = { src: `test`, alt: `test` };
    component.onSearchImage(`somegibberish`);
    expect(component.showSearch).toBe(true);
  });

  it('should test onSearchImage method if query returns images', (): void => {
    const response: Pexels = mockPexelsResponse;
    const updateStateSpy: jasmine.Spy = spyOn(component, `updateState`);
    spyOn(imageService, `fetchImages`).and.returnValue(of(response));
    component.onSearchImage(`mock`);
    expect(component.fetchedImages[0].src).toEqual(response.photos[0].src);
    expect(component.fetchedImages[0].alt).toEqual(response.photos[0].alt);
    expect(updateStateSpy).toHaveBeenCalledWith(`grid`);
    expect(component.fetchedImages).toEqual(response.photos);
    expect(component.showSearch).toBe(true);
    expect(component.loadingSpinner).toBe(false);
  });

  it('should test onSearchImage method if query returns images', (): void => {
    const alertSpy: jasmine.Spy = spyOn(window, 'alert');
    spyOn(imageService, `fetchImages`).and.returnValue(
      throwError({
        status: 400,
      })
    );
    component.onSearchImage(`mock`);
    expect(alertSpy).toHaveBeenCalledWith(
      `There's been a server error with a status: 400 :(`
    );
  });

  it('should test updateState method', (): void => {
    const updateStateSpy: jasmine.Spy = spyOn(component, `updateState`);
    component.updateState(`grid`);
    expect(updateStateSpy).toHaveBeenCalledWith(`grid`);
    component.updateState(`single`);
    expect(updateStateSpy).toHaveBeenCalledWith(`single`);
  });

  it('should simulate an image search on click', (): void => {
    const onSearchSpy: jasmine.Spy = spyOn(component, `onSearchImage`);
    let searchInput = fixture.nativeElement.querySelector(`.img-search-input`);
    searchInput.value = `testing`;
    fixture.nativeElement.querySelector(`.search-btn`).click();
    expect(onSearchSpy).toHaveBeenCalledWith(`testing`);
  });

  it('should test ngOnDestroy', (): void => {
    const unsubSpy: jasmine.Spy = spyOn(component.subscription, `unsubscribe`);
    component.ngOnDestroy();
    expect(unsubSpy).toHaveBeenCalled();
  });

  it('should test shouldDisplayImageSearch getter', (): void => {
    component.loadingSpinner = false;
    component.curSelectedImage = { src: `test`, alt: `test` };
    const todo = newTodo.getTodo;
    component.editInfo = { id: 0, todo };
    expect(component.shouldDisplayImageSearch).toBe(component.editInfo);
  });

  it('should test shouldDisplayImageSearch getter', (): void => {
    component.loadingSpinner = false;
    component.curSelectedImage = { src: `test`, alt: `test` };
    const todo: Todo = newTodo.getTodo;
    component.editInfo = { id: 0, todo };
    expect(component.shouldDisplayImageSearch).toBe(component.editInfo);
    component.loadingSpinner = true;
    expect(component.shouldDisplayImageSearch).toBe(false);
  });

  it('should test hasFetchedImages getter', (): void => {
    expect(component.hasFetchedImages).toBe(false);
    component.fetchedImages = pexelsApiResponse.photos;
    expect(component.hasFetchedImages).toBe(true);
  });
});
