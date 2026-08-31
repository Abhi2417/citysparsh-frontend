// src/app/core/services/toast.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private _toasts = new BehaviorSubject<Toast[]>([]);

  /** Subscribe to this in the ToastComponent template */
  toasts$ = this._toasts.asObservable();

  show(message: string, type: Toast['type'] = 'info', duration = 3500): void {
    const id = ++this.counter;
    this._toasts.next([...this._toasts.value, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number): void {
    this._toasts.next(this._toasts.value.filter(t => t.id !== id));
  }

  // Convenience helpers
  success(msg: string): void { this.show(msg, 'success'); }
  error(msg: string): void   { this.show(msg, 'error'); }
  info(msg: string): void    { this.show(msg, 'info'); }
  warning(msg: string): void { this.show(msg, 'warning'); }
}
