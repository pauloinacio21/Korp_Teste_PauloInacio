import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 422 = erro de negócio tratado pelo componente, não exibe snackbar
      if (error.status === 422) return throwError(() => error);

      let message = 'Erro inesperado. Tente novamente.';

      if (error.status === 0 || error.status === 503) {
        message = 'Serviço indisponível. Verifique sua conexão ou tente mais tarde.';
      } else if (error.status === 400) {
        message = error.error?.message ?? 'Requisição inválida.';
      } else if (error.status === 404) {
        message = 'Recurso não encontrado.';
      } else if (error.status === 409) {
        message = error.error?.message ?? 'Conflito de dados.';
      } else if (error.status === 502) {
        message = error.error?.message ?? 'Erro de comunicação entre serviços.';
      } else if (error.status >= 500) {
        message = error.error?.message ?? 'Erro interno no servidor.';
      }

      snackBar.open(message, 'Fechar', {
        duration: 5000,
        panelClass: ['snack-error']
      });

      return throwError(() => error);
    })
  );
};
