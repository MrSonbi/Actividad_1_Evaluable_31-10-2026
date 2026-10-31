import { computed, DOCUMENT, inject, Injectable, signal } from '@angular/core';

/** Clave de `localStorage` con la elección del usuario. */
const STORAGE_KEY = 'app-theme';

/** Clase de Ionic que activa la paleta oscura en `<html>`. */
const DARK_CLASS = 'ion-palette-dark';

/** Tema que puede elegir el usuario. */
type ThemeChoice = 'light' | 'dark';

/**
 * Gestiona el modo claro u oscuro.
 *
 * Sigue el modo del sistema hasta que el usuario elige uno; esa elección se
 * guarda en este navegador y tiene prioridad a partir de entonces.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');
  private readonly choice = signal<ThemeChoice | null>(this.readChoice());
  private readonly systemDark = signal(this.media?.matches ?? false);

  /** Indica si el modo oscuro está activo. */
  readonly isDark = computed(() => {
    const choice = this.choice();
    return choice ? choice === 'dark' : this.systemDark();
  });

  constructor() {
    this.apply();
    this.media?.addEventListener('change', (event: MediaQueryListEvent) => {
      this.systemDark.set(event.matches);
      this.apply();
    });
  }

  /** Cambia al modo contrario y guarda la elección. */
  toggle(): void {
    const next: ThemeChoice = this.isDark() ? 'light' : 'dark';
    this.choice.set(next);
    this.apply();
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento disponible, el cambio dura solo hasta recargar la página.
    }
  }

  /** Aplica la clase del tema activo a `<html>`. */
  private apply(): void {
    this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark());
  }

  /** Lee la elección guardada; devuelve `null` si no hay una válida o no se puede leer. */
  private readChoice(): ThemeChoice | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }
}
