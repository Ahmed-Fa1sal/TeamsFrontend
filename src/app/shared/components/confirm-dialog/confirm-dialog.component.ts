import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.header }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ data.rejectLabel }}</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">{{ data.acceptLabel }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { font-size: 1.1rem; font-weight: 600; }
    mat-dialog-content { font-size: 0.95rem; color: #444; }
    mat-dialog-actions { gap: 8px; padding-bottom: 16px; }
  `]
})
export class ConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {}
}
