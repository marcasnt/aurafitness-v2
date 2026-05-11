/**
 * Calcula el porcentaje de grasa corporal usando una FÓRMULA HÍBRIDA
 * que combina US Navy Method + Deurenberg para máxima precisión.
 *
 * US Navy Method (Hodgdon & Beckett, 1984):
 *   Usa perimetros (cintura, cuello, cadera) y altura.
 *   Es precisa para población activa/fitness.
 *
 * Deurenberg Formula (1991):
 *   Usa IMC (peso/altura²), edad y género.
 *   Es precisa para población general y corrige por edad.
 *
 * RESULTADO: promedio ponderado de ambas (60% Navy + 40% Deurenberg)
 * Esto usa TODOS los datos: perimetros + género + edad + peso + altura.
 */

interface BodyFatInput {
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  age: number;
  neck: number;   // cm
  waist: number;  // cm
  hips: number;   // cm (solo se usa para mujeres en Navy)
}

function calculateUSNavy({ gender, height, neck, waist, hips }: Omit<BodyFatInput, 'weight' | 'age'>): number | null {
  if (!height || !neck || !waist) return null;
  if (gender === 'female' && !hips) return null;
  if (gender === 'male' && waist <= neck) return null;
  if (gender === 'female' && waist + hips <= neck) return null;

  const log10 = Math.log10;
  let bodyFat: number;

  if (gender === 'male') {
    bodyFat = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76;
  } else {
    bodyFat = 163.205 * log10(waist + hips - neck) - 97.684 * log10(height) - 78.387;
  }

  return bodyFat;
}

function calculateDeurenberg({ gender, height, weight, age }: Pick<BodyFatInput, 'gender' | 'height' | 'weight' | 'age'>): number | null {
  if (!height || !weight || !age) return null;

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const sex = gender === 'male' ? 1 : 0;

  // Fórmula Deurenberg: %BF = (1.20 × BMI) + (0.23 × age) − (10.8 × sex) − 5.4
  const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * sex) - 5.4;

  return bodyFat;
}

export function calculateBodyFat(input: BodyFatInput): number | null {
  const navy = calculateUSNavy(input);
  const deurenberg = calculateDeurenberg(input);

  if (navy === null && deurenberg === null) return null;
  if (navy === null) return Number(deurenberg!.toFixed(1));
  if (deurenberg === null) return Number(navy.toFixed(1));

  // Promedio ponderado: 60% Navy + 40% Deurenberg
  // Navy es más precisa para fitness, Deurenberg corrige por edad
  const blended = navy * 0.6 + deurenberg * 0.4;

  // Clamp a rangos fisiológicamente razonables
  let result = blended;
  if (result < 2) result = 2;
  if (result > 60) result = 60;

  return Number(result.toFixed(1));
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
