import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver } from '@angular/cdk/layout';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule
  ],
  template: `
    <mat-toolbar class="toolbar korp-toolbar">
      <button mat-icon-button (click)="sidenav.toggle()" style="color:white">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="title">
        <span class="title-korp">KORP</span>
        <span class="title-sep">|</span>
        <span class="title-sub">Sistema de NF</span>
      </span>
    </mat-toolbar>

    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav [mode]="isMobile ? 'over' : 'side'" [opened]="!isMobile" class="sidenav">
        <div class="sidenav-brand">
          <mat-icon class="brand-icon">storefront</mat-icon>
        </div>
        <mat-nav-list>
          <a mat-list-item routerLink="/produtos" routerLinkActive="active-link"
            (click)="isMobile && sidenav.close()">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span matListItemTitle>Produtos</span>
          </a>
          <a mat-list-item routerLink="/notas-fiscais" routerLinkActive="active-link"
            (click)="isMobile && sidenav.close()">
            <mat-icon matListItemIcon>receipt_long</mat-icon>
            <span matListItemTitle>Notas Fiscais</span>
          </a>
          <a mat-list-item routerLink="/categorias" routerLinkActive="active-link"
            (click)="isMobile && sidenav.close()">
            <mat-icon matListItemIcon>category</mat-icon>
            <span matListItemTitle>Categorias</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .toolbar { position: fixed; top: 0; z-index: 100; }
    .title { margin-left: 8px; font-weight: 500; letter-spacing: 0.3px; display: flex; align-items: center; gap: 10px; }
    .title-korp { font-weight: 800; letter-spacing: 2px; font-size: 1.05rem; }
    .title-sep { opacity: 0.35; font-weight: 300; }
    .sidenav-container { margin-top: 64px; height: calc(100vh - 64px); }
    .sidenav { width: 220px; padding-top: 8px; }
    .sidenav-brand { display: flex; align-items: center; justify-content: center; padding: 12px 0 8px; border-bottom: 1px solid #eef2f5; margin-bottom: 8px; }
    .brand-icon { color: #8CB2CA; font-size: 28px; height: 28px; width: 28px; }
    .content { padding: 24px; }

    @media (max-width: 768px) {
      .content { padding: 16px; }
    }
    @media (max-width: 480px) {
      .title-sep, .title-sub { display: none; }
    }
  `]
})
export class AppComponent {
  isMobile = false;

  constructor(private bp: BreakpointObserver) {
    this.bp.observe('(max-width: 768px)').subscribe(state => {
      this.isMobile = state.matches;
    });
  }
}
