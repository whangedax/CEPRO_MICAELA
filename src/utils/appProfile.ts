/**
 * src/utils/appProfile.ts
 * 
 * Detección de perfil de ejecución — CEPRO_MICAELA 2.0 (Tarea 42).
 * Permite alternar entre el perfil de desarrollo/QA y el perfil institucional limpio (OBS-41B-02).
 */

declare const __IS_INSTITUTIONAL__: boolean | undefined;

export const IS_INSTITUTIONAL: boolean =
  typeof __IS_INSTITUTIONAL__ !== 'undefined'
    ? Boolean(__IS_INSTITUTIONAL__)
    : (
        (typeof import.meta !== 'undefined' && import.meta.env && (
          import.meta.env.MODE === 'institutional' ||
          import.meta.env.VITE_APP_PROFILE === 'institutional'
        )) || false
      );

export function isInstitutional(): boolean {
  return IS_INSTITUTIONAL;
}
