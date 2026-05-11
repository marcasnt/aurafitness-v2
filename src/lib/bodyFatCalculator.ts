/**
 * Calculadora de % Grasa Corporal — AURA Fitness Elite
 *
 * Usa la formula estandar US Navy Method (constantes 495/450),
 * la misma que usa fitgeneration.es, Bodybuilding.com y apps de fitness.
 *
 * MODOS:
 * 1. Con perimetros (cintura, cuello, cadera) → US Navy 495/450
 *    Es la mas precisa para poblacion activa/fitness.
 * 2. Sin perimetros → Deurenberg (IMC + edad + genero)
 *    Fallback cuando no se midieron perimetros.
 *
 * REFERENCIA:
 *   Hodgdon & Beckett (1984) — US Navy Method
 *   Deurenberg et al. (1991) — Formula basada en IMC
 */

export interface BodyFatInput {
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  age: number;
  neck?: number;   // cm (opcional)
  waist?: number;  // cm (opcional)
  hips?: number;   // cm (opcional, solo mujeres)
}

/**
 * US Navy Method con constantes 495/450.
 * Version estandar en la comunidad fitness (fitgeneration, Bodybuilding.com, etc.)
 */
function calculateUSNavy495({ gender, height, neck, waist, hips }: {
  gender: 'male' | 'female';
  height: number;
  neck?: number;
  waist?: number;
  hips?: number;
}): number | null {
  if (!height || !neck || !waist) return null;
  if (gender === 'female' && !hips) return null;
  if (gender === 'male' && waist <= neck) return null;
  if (gender === 'female' && (waist + hips) <= neck) return null;

  const log10 = Math.log10;
  let bodyFat: number;

  if (gender === 'male') {
    // Hombres: 495 / (1.0324 - 0.19077*log10(cintura-cuello) + 0.15456*log10(altura)) - 450
    bodyFat = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450;
  } else {
    // Mujeres: 495 / (1.29579 - 0.35004*log10(cintura+cadera-cuello) + 0.221*log10(altura)) - 450
    bodyFat = 495 / (1.29579 - 0.35004 * log10(waist + hips! - neck) + 0.221 * log10(height)) - 450;
  }

  return bodyFat;
}

/**
 * Formula Deurenberg (1991) — fallback cuando no hay perimetros.
 * Usa IMC (peso/altura^2), edad y genero.
 */
function calculateDeurenberg({ gender, height, weight, age }: Pick<BodyFatInput, 'gender' | 'height' | 'weight' | 'age'>): number | null {
  if (!height || !weight || !age) return null;

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const sex = gender === 'male' ? 1 : 0;

  // Deurenberg estandar: %BF = (1.20 * BMI) + (0.23 * age) - (10.8 * sex) - 5.4
  const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * sex) - 5.4;

  return bodyFat;
}

/**
 * Calcula el % de grasa corporal.
 *
 * Prioridad:
 * 1. Si hay perimetros (cintura + cuello + cadera para mujeres) → US Navy 495/450
 * 2. Si NO hay perimetros → Deurenberg (IMC + edad + genero)
 */
export function calculateBodyFat(input: BodyFatInput): number | null {
  const hasPerimeters = input.waist && input.waist > 0 && input.neck && input.neck > 0;
  const hasHipsForFemale = input.gender === 'female' ? (input.hips && input.hips > 0) : true;

  let result: number | null = null;

  if (hasPerimeters && hasHipsForFemale) {
    // Modo avanzado: US Navy 495/450 (mas preciso para fitness)
    result = calculateUSNavy495(input);
  }

  // Si no hay perimetros o US Navy dio invalido, usar Deurenberg como fallback
  if (result === null) {
    result = calculateDeurenberg(input);
  }

  if (result === null) return null;

  // Clamp a rangos fisiologicamente razonables para fitness
  // Hombres: 2% (esencial) a 35% (obesidad clase I)
  // Mujeres: 10% (esencial) a 45% (obesidad clase I)
  const min = input.gender === 'male' ? 2 : 10;
  const max = input.gender === 'male' ? 35 : 45;

  let clamped = result;
  if (clamped < min) clamped = min;
  if (clamped > max) clamped = max;

  return Number(clamped.toFixed(1));
}

/**
 * Categoria visual del % de grasa corporal
 * Basado en estandares de la American Council on Exercise (ACE)
 */
export function getBodyFatCategory(gender: 'male' | 'female', bodyFat: number): string {
  if (gender === 'male') {
    if (bodyFat < 6) return 'Grasa Esencial';
    if (bodyFat < 14) return 'Atleta';
    if (bodyFat < 18) return 'Fitness';
    if (bodyFat < 25) return 'Promedio';
    return 'Obesidad';
  } else {
    if (bodyFat < 14) return 'Grasa Esencial';
    if (bodyFat < 21) return 'Atleta';
    if (bodyFat < 25) return 'Fitness';
    if (bodyFat < 32) return 'Promedio';
    return 'Obesidad';
  }
}

/**
 * Color asociado a la categoria para UI
 */
export function getBodyFatColor(bodyFat: number, gender: 'male' | 'female'): string {
  const cat = getBodyFatCategory(gender, bodyFat);
  switch (cat) {
    case 'Grasa Esencial': return '#00e5ff';
    case 'Atleta': return '#d4f826';
    case 'Fitness': return '#76ff03';
    case 'Promedio': return '#ff9100';
    case 'Obesidad': return '#ff5449';
    default: return '#8e8e93';
  }
}
