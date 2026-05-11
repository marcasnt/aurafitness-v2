/**
 * Calcula el porcentaje de grasa corporal usando la fórmula US Navy Method.
 * Fuente: Hodgdon & Beckett (1984) — estándar del Departamento de Defensa de EE.UU.
 *
 * Fórmulas (medidas en pulgadas originalmente, convertimos desde cm):
 *
 * HOMBRES:
 *   %BF = 86.010 × log10(cintura − cuello) − 70.041 × log10(altura) + 36.76
 *
 * MUJERES:
 *   %BF = 163.205 × log10(cintura + cadera − cuello) − 97.684 × log10(altura) − 78.387
 *
 * Nota: Los logaritmos son base 10. Las medidas deben estar en la MISMA unidad.
 *        Nosotros recibimos cm y convertimos internamente (la fórmula es unit-agnostic
 *        siempre que todas las medidas usen la misma escala).
 */

interface BodyFatInput {
  gender: 'male' | 'female';
  height: number; // cm
  neck: number;   // cm
  waist: number;  // cm
  hips: number;   // cm (solo se usa para mujeres)
}

export function calculateBodyFat({ gender, height, neck, waist, hips }: BodyFatInput): number | null {
  if (!height || !neck || !waist) return null;
  if (gender === 'female' && !hips) return null;

  // Asegurar que cintura > cuello (hombres) o cintura+cadera > cuello (mujeres)
  if (gender === 'male' && waist <= neck) return null;
  if (gender === 'female' && waist + hips <= neck) return null;

  const log10 = Math.log10;

  let bodyFat: number;

  if (gender === 'male') {
    bodyFat = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76;
  } else {
    bodyFat = 163.205 * log10(waist + hips - neck) - 97.684 * log10(height) - 78.387;
  }

  // Clamp a rangos fisiológicamente razonables
  if (bodyFat < 2) bodyFat = 2;
  if (bodyFat > 60) bodyFat = 60;

  return Number(bodyFat.toFixed(1));
}

/**
 * Devuelve una categoría visual para el % de grasa corporal
 */
export function getBodyFatCategory(gender: 'male' | 'female', bodyFat: number): string {
  if (gender === 'male') {
    if (bodyFat < 6) return 'Esencial';
    if (bodyFat < 14) return 'Atleta';
    if (bodyFat < 18) return 'Fitness';
    if (bodyFat < 25) return 'Promedio';
    return 'Sobrepeso';
  } else {
    if (bodyFat < 14) return 'Esencial';
    if (bodyFat < 21) return 'Atleta';
    if (bodyFat < 25) return 'Fitness';
    if (bodyFat < 32) return 'Promedio';
    return 'Sobrepeso';
  }
}

/**
 * Color asociado a la categoría para UI
 */
export function getBodyFatColor(bodyFat: number, gender: 'male' | 'female'): string {
  const cat = getBodyFatCategory(gender, bodyFat);
  switch (cat) {
    case 'Esencial': return '#00e5ff';
    case 'Atleta': return '#d4f826';
    case 'Fitness': return '#76ff03';
    case 'Promedio': return '#ff9100';
    case 'Sobrepeso': return '#ff5449';
    default: return '#8e8e93';
  }
}
