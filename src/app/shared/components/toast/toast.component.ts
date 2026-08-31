// src/app/shared/components/toast/toast.component.ts

import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      <div
        *ngFor="let t of toastSvc.toasts$ | async; trackBy: trackById"
        class="toast-item toast-{{ t.type }}"
        (click)="toastSvc.remove(t.id)"
        role="alert"
      >
        <!-- Icon -->
        <span class="toast-icon">
          <i class="bi" [ngClass]="{
            'bi-check-circle-fill' : t.type === 'success',
            'bi-x-circle-fill'     : t.type === 'error',
            'bi-exclamation-circle-fill': t.type === 'warning',
            'bi-info-circle-fill'  : t.type === 'info'
          }"></i>
        </span>

        <!-- Message -->
        <span class="toast-msg">{{ t.message }}</span>

        <!-- Close -->
        <button class="toast-close" (click)="toastSvc.remove(t.id)" aria-label="Dismiss">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 360px;
      width: calc(100vw - 40px);
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 14px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      cursor: pointer;
      pointer-events: all;
      animation: slideIn 0.22s ease;
      border-left-width: 4px;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* Type colour strips */
    .toast-success { border-left-color: #10b981; }
    .toast-error   { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-info    { border-left-color: #3b82f6; }

    .toast-icon {
      font-size: 16px;
      flex-shrink: 0;
      line-height: 1;
    }

    .toast-success .toast-icon { color: #10b981; }
    .toast-error   .toast-icon { color: #ef4444; }
    .toast-warning .toast-icon { color: #f59e0b; }
    .toast-info    .toast-icon { color: #3b82f6; }

    .toast-msg {
      flex: 1;
      font-size: 13px;
      font-family: 'DM Sans', system-ui, sans-serif;
      color: #0f172a;
      line-height: 1.5;
    }

    .toast-close {
      background: none;
      border: none;
      padding: 2px 4px;
      cursor: pointer;
      color: #94a3b8;
      font-size: 16px;
      line-height: 1;
      border-radius: 4px;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    .toast-close:hover { color: #475569; }
  `],
})
export class ToastComponent {
  constructor(public toastSvc: ToastService) {}

  trackById(_: number, t: Toast): number {
    return t.id;
  }
}
