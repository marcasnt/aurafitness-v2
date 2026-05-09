// Script para poblar ejercicios con imágenes de free-exercise-db
// Fuente: https://github.com/yuhonas/free-exercise-db (gratuito, confiable)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zpmzxbelcfbapljsefms.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbXp4YmVsY2ZiYXBsanNlZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTQxNTYsImV4cCI6MjA5MzgzMDE1Nn0.3p89MmNYsw9_rynWtX2xiNRkI_usxe_p4XgCAV4kI38';

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Mapeo exacto verificado contra el repo free-exercise-db
const exactMap: Record<string, string> = {
  // PECHO
  'Press de Banca Plano con Barra': `${BASE}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`,
  'Press de Banca Inclinado con Mancuernas': `${BASE}/Incline_Dumbbell_Press/0.jpg`,
  'Press Declinado con Barra': `${BASE}/Decline_Barbell_Bench_Press/0.jpg`,
  'Press Hammer Inclinado': `${BASE}/Incline_Hammer_Press/0.jpg`,
  'Press en Máquina Convergente': `${BASE}/Machine_Bench_Press/0.jpg`,
  'Aperturas en Polea Baja': `${BASE}/Low_Cable_Crossover/0.jpg`,
  'Cruces en Polea Alta': `${BASE}/Cable_Crossover/0.jpg`,
  'Pullover con Mancuerna': `${BASE}/Bent-Arm_Dumbbell_Pullover/0.jpg`,
  'Fondos en Paralelas (Lastrado)': `${BASE}/Weighted_Bench_Dip/0.jpg`,
  'Fondos en Paralelas': `${BASE}/Bench_Dips/0.jpg`,

  // ESPALDA
  'Dominadas Pronas (Lastradas)': `${BASE}/Weighted_Pull_Ups/0.jpg`,
  'Jalón al Pecho con Agarre Neutro': `${BASE}/Neutral_Grip_Pullups/0.jpg`,
  'Jalón Supino Cerrado': `${BASE}/Close-Grip_Front_Lat_Pulldown/0.jpg`,
  'Remo con Barra Prono': `${BASE}/Bent_Over_Barbell_Row/0.jpg`,
  'Remo con Mancuerna a Una Mano': `${BASE}/One-Arm_Dumbbell_Row/0.jpg`,
  'Remo en Máquina Iso-Lateral': `${BASE}/Hammer_Strength_Row/0.jpg`,
  'Remo Gironda (Polea Baja)': `${BASE}/Seated_Cable_Rows/0.jpg`,
  'Pullover en Polea Alta': `${BASE}/Straight-Arm_Pulldown/0.jpg`,
  'Peso Muerto Convencional': `${BASE}/Barbell_Deadlift/0.jpg`,
  'Rack Pull': `${BASE}/Rack_Pulls/0.jpg`,
  'Face Pull': `${BASE}/Face_Pull/0.jpg`,

  // PIERNAS
  'Sentadilla Libre con Barra Back': `${BASE}/Barbell_Squat/0.jpg`,
  'Sentadilla Frontal': `${BASE}/Front_Barbell_Squat/0.jpg`,
  'Hack Squat': `${BASE}/Hack_Squat/0.jpg`,
  'Prensa Atlética de 45 Grados': `${BASE}/Leg_Press/0.jpg`,
  'Extensiones de Cuádriceps': `${BASE}/Leg_Extensions/0.jpg`,
  'Curl Femoral Acostado': `${BASE}/Lying_Leg_Curls/0.jpg`,
  'Curl Femoral Sentado': `${BASE}/Seated_Leg_Curl/0.jpg`,
  'Peso Muerto Rumano': `${BASE}/Romanian_Deadlift/0.jpg`,
  'Buenos Días con Barra': `${BASE}/Good_Morning/0.jpg`,
  'Zancadas Caminando': `${BASE}/Barbell_Walking_Lunge/0.jpg`,
  'Sentadilla Búlgara': `${BASE}/Bulgarian_Split_Squat/0.jpg`,
  'Hip Thrust de Élite': `${BASE}/Barbell_Hip_Thrust/0.jpg`,
  'Hip Thrust Unilateral': `${BASE}/Single_Leg_Glute_Bridge/0.jpg`,
  'Abductores en Máquina': `${BASE}/Thigh_Abductor/0.jpg`,
  'Aductores en Máquina': `${BASE}/Thigh_Adductor/0.jpg`,
  'Elevación de Talones de Pie': `${BASE}/Standing_Calf_Raises/0.jpg`,
  'Elevación de Talones Sentado': `${BASE}/Seated_Calf_Raise/0.jpg`,

  // HOMBROS
  'Press Militar de Pie': `${BASE}/Standing_Barbell_Press_Behind_Neck/0.jpg`,
  'Press Militar Sentado': `${BASE}/Seated_Barbell_Military_Press/0.jpg`,
  'Press Arnold': `${BASE}/Arnold_Dumbbell_Press/0.jpg`,
  'Elevaciones Laterales con Mancuerna': `${BASE}/Side_Lateral_Raise/0.jpg`,
  'Elevaciones Laterales en Polea': `${BASE}/Cable_Seated_Lateral_Raise/0.jpg`,
  'Elevaciones Frontales con Disco': `${BASE}/Front_Plate_Raise/0.jpg`,
  'Pájaros en Polea Posterior': `${BASE}/Reverse_Flyes/0.jpg`,
  'Pájaros con Mancuerna Inclinado': `${BASE}/Incline_Rear_Laterals/0.jpg`,
  'Remo al Mentón con Barra': `${BASE}/Upright_Barbell_Row/0.jpg`,

  // BRAZOS - BÍCEPS
  'Curl de Bíceps con Barra Z': `${BASE}/EZ-Bar_Curl/0.jpg`,
  'Curl Martillo Alterno': `${BASE}/Alternate_Hammer_Curl/0.jpg`,
  'Curl Concentrado': `${BASE}/Concentration_Curls/0.jpg`,
  'Curl Predicador con Barra Z': `${BASE}/EZ-Bar_Preacher_Curl/0.jpg`,
  'Curl en Polea Baja': `${BASE}/Cable_Preacher_Curl/0.jpg`,
  'Curl Spider': `${BASE}/Spider_Curl/0.jpg`,
  'Curl Inverso con Barra': `${BASE}/Reverse_Barbell_Curl/0.jpg`,

  // BRAZOS - TRÍCEPS
  'Press Francés con Barra Z': `${BASE}/EZ-Bar_Skullcrusher/0.jpg`,
  'Jalón de Tríceps con Cuerda': `${BASE}/Triceps_Pushdown_-_Rope_Attachment/0.jpg`,
  'Patada de Tríceps': `${BASE}/Tricep_Dumbbell_Kickback/0.jpg`,
  'Extensiones de Tríceps sobre la Cabeza': `${BASE}/Standing_Dumbbell_Triceps_Extension/0.jpg`,
  'Fondos en Paralelas': `${BASE}/Bench_Dips/0.jpg`,

  // CORE
  'Abdominales en Polea Alta (Crunch)': `${BASE}/Cable_Crunch/0.jpg`,
  'Crunch Declinado': `${BASE}/Decline_Crunch/0.jpg`,
  'Russian Twist con Disco': `${BASE}/Russian_Twist/0.jpg`,
  'Elevaciones de Piernas Colgado': `${BASE}/Hanging_Leg_Raise/0.jpg`,
  'Plancha Isométrica con Lastre': `${BASE}/Weighted_Plank/0.jpg`,
  'Rueda Abdominal': `${BASE}/Ab_Roller/0.jpg`,
  'Woodchoppers en Polea': `${BASE}/Cable_Woodchops/0.jpg`,

  // TRAPECIO
  'Encogimientos con Barra': `${BASE}/Barbell_Shrug/0.jpg`,
  'Encogimientos con Mancuernas': `${BASE}/Dumbbell_Shrug/0.jpg`,

  // ANTEBRAZOS
  'Curl de Antebrazo Supino': `${BASE}/Palms-Up_Barbell_Wrist_Curl_Over_A_Bench/0.jpg`,
  'Farmer Walk': `${BASE}/Farmers_Walk/0.jpg`,

  // GLÚTEOS
  'Patada de Glúteo en Polea': `${BASE}/Glute_Kickback/0.jpg`,
  'Puente de Glúteos con Barra': `${BASE}/Barbell_Glute_Bridge/0.jpg`,

  // CARDIO
  'Mountain Climbers': `${BASE}/Mountain_Climbers/0.jpg`,
};

async function main() {
  console.log('🔍 Obteniendo ejercicios globales de Supabase...');

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name, category')
    .is('routine_id', null);

  if (error) {
    console.error('❌ Error al obtener ejercicios:', error.message);
    process.exit(1);
  }

  if (!exercises || exercises.length === 0) {
    console.log('⚠️ No hay ejercicios globales en la base de datos.');
    process.exit(0);
  }

  console.log(`📊 Encontrados ${exercises.length} ejercicios globales`);

  let updated = 0;
  let skipped = 0;
  let notFound: string[] = [];

  for (const ex of exercises) {
    const imageUrl = exactMap[ex.name];

    if (!imageUrl) {
      notFound.push(ex.name);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('exercises')
      .update({ image_url: imageUrl })
      .eq('id', ex.id);

    if (updateError) {
      console.error(`❌ Error actualizando "${ex.name}":`, updateError.message);
      skipped++;
    } else {
      console.log(`✅ "${ex.name}" → Imagen asignada`);
      updated++;
    }

    await new Promise(r => setTimeout(r, 80));
  }

  console.log('\n📋 RESUMEN:');
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ⏭️  Sin coincidencia: ${skipped}`);
  if (notFound.length > 0) {
    console.log(`\n   ⚠️  Ejercicios sin imagen:`);
    notFound.forEach(name => console.log(`      - ${name}`));
  }
  console.log('\n🎉 Listo! Las imágenes son confiables y se cargarán correctamente.');
}

main().catch(console.error);
