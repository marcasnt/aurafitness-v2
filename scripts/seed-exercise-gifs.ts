// Script para poblar los 72 ejercicios globales con URLs de GIFs
// Fuente: fitcron.com (gratuito, sin API key)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zpmzxbelcfbapljsefms.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbXp4YmVsY2ZiYXBsanNlZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTQxNTYsImV4cCI6MjA5MzgzMDE1Nn0.3p89MmNYsw9_rynWtX2xiNRkI_usxe_p4XgCAV4kI38';

const supabase = createClient(supabaseUrl, supabaseKey);

const B = 'https://fitcron.com/wp-content/uploads/2021/04/04101301';

// Mapeo completo: nombre exacto en BD → URL del GIF
const gifMap: Record<string, string> = {
  // PECHO
  'Press de Banca Plano con Barra': `${B}-Barbell-Bench-Press_Chest_720.gif`,
  'Press de Banca Inclinado con Mancuernas': `${B}-Dumbbell-Incline-Bench-Press_Chest_720.gif`,
  'Press Declinado con Barra': `${B}-Barbell-Decline-Bench-Press_Chest_720.gif`,
  'Press Hammer Inclinado': `${B}-Lever-Incline-Chest-Press_Chest_720.gif`,
  'Press en Máquina Convergente': `${B}-Lever-Seated-Fly_Chest_720.gif`,
  'Aperturas en Polea Baja': `${B}-Cable-Low-Fly_Chest_720.gif`,
  'Cruces en Polea Alta': `${B}-Cable-Upper-Chest-Crossovers_Chest_720.gif`,
  'Pullover con Mancuerna': `${B}-Dumbbell-Pullover_Chest_720.gif`,
  'Fondos en Paralelas (Lastrado)': `${B}-Weighted-Triceps-Dip_Chest_720.gif`,
  'Fondos en Paralelas': `${B}-Chest-Dip_Chest_720.gif`,

  // ESPALDA
  'Dominadas Pronas (Lastradas)': `${B}-Weighted-Pull-up_Back_720.gif`,
  'Jalón al Pecho con Agarre Neutro': `${B}-Cable-Neutral-Grip-Lat-Pulldown_Back_720.gif`,
  'Jalón Supino Cerrado': `${B}-Cable-Close-Grip-Pulldown_Back_720.gif`,
  'Remo con Barra Prono': `${B}-Barbell-Bent-Over-Row_Back_720.gif`,
  'Remo con Mancuerna a Una Mano': `${B}-Dumbbell-Bent-Over-Row_Back_720.gif`,
  'Remo en Máquina Iso-Lateral': `${B}-Lever-Iso-Lateral-Row_Back_720.gif`,
  'Remo Gironda (Polea Baja)': `${B}-Cable-Seated-Row_Back_720.gif`,
  'Pullover en Polea Alta': `${B}-Cable-Pullover_Back_720.gif`,
  'Peso Muerto Convencional': `${B}-Barbell-Deadlift_Back_720.gif`,
  'Rack Pull': `${B}-Barbell-Rack-Pull_Back_720.gif`,
  'Face Pull': `${B}-Cable-Face-Pull_Back_720.gif`,

  // PIERNAS
  'Sentadilla Libre con Barra Back': `${B}-Barbell-Squat_Thighs_720.gif`,
  'Sentadilla Frontal': `${B}-Barbell-Front-Squat_Thighs_720.gif`,
  'Hack Squat': `${B}-Hack-Squat_Thighs_720.gif`,
  'Prensa Atlética de 45 Grados': `${B}-Sled-45-Press_Thighs_720.gif`,
  'Extensiones de Cuádriceps': `${B}-Leg-Extension_Thighs_720.gif`,
  'Curl Femoral Acostado': `${B}-Leg-Curl_Thighs_720.gif`,
  'Curl Femoral Sentado': `${B}-Seated-Leg-Curl_Thighs_720.gif`,
  'Peso Muerto Rumano': `${B}-Barbell-Romanian-Deadlift_Thighs_720.gif`,
  'Buenos Días con Barra': `${B}-Barbell-Good-Morning_Thighs_720.gif`,
  'Zancadas Caminando': `${B}-Dumbbell-Walking-Lunge_Thighs_720.gif`,
  'Sentadilla Búlgara': `${B}-Dumbbell-Bulgarian-Split-Squat_Thighs_720.gif`,
  'Hip Thrust de Élite': `${B}-Barbell-Hip-Thrust_Thighs_720.gif`,
  'Hip Thrust Unilateral': `${B}-Dumbbell-Single-Leg-Hip-Thrust_Thighs_720.gif`,
  'Abductores en Máquina': `${B}-Lever-Hip-Abduction_Thighs_720.gif`,
  'Aductores en Máquina': `${B}-Lever-Hip-Adduction_Thighs_720.gif`,
  'Elevación de Talones de Pie': `${B}-Standing-Calf-Raise_Thighs_720.gif`,
  'Elevación de Talones Sentado': `${B}-Seated-Calf-Raise_Thighs_720.gif`,

  // HOMBROS
  'Press Militar de Pie': `${B}-Barbell-Standing-Military-Press_Shoulders_720.gif`,
  'Press Militar Sentado': `${B}-Barbell-Seated-Shoulder-Press_Shoulders_720.gif`,
  'Press Arnold': `${B}-Dumbbell-Arnold-Press_Shoulders_720.gif`,
  'Elevaciones Laterales con Mancuerna': `${B}-Dumbbell-Lateral-Raise_Shoulders_720.gif`,
  'Elevaciones Laterales en Polea': `${B}-Cable-Lateral-Raise_Shoulders_720.gif`,
  'Elevaciones Frontales con Disco': `${B}-Plate-Front-Raise_Shoulders_720.gif`,
  'Pájaros en Polea Posterior': `${B}-Lever-Seated-Reverse-Fly_Shoulders_720.gif`,
  'Pájaros con Mancuerna Inclinado': `${B}-Dumbbell-Incline-Reverse-Fly_Shoulders_720.gif`,
  'Remo al Mentón con Barra': `${B}-Barbell-Upright-Row_Shoulders_720.gif`,

  // BRAZOS - BÍCEPS
  'Curl de Bíceps con Barra Z': `${B}-EZ-Barbell-Curl_Biceps_720.gif`,
  'Curl Martillo Alterno': `${B}-Dumbbell-Hammer-Curl_Biceps_720.gif`,
  'Curl Concentrado': `${B}-Dumbbell-Concentration-Curl_Biceps_720.gif`,
  'Curl Predicador con Barra Z': `${B}-EZ-Barbell-Preacher-Curl_Biceps_720.gif`,
  'Curl en Polea Baja': `${B}-Cable-Curl_Biceps_720.gif`,
  'Curl Spider': `${B}-Dumbbell-Spider-Curl_Biceps_720.gif`,
  'Curl Inverso con Barra': `${B}-Barbell-Reverse-Curl_Biceps_720.gif`,

  // BRAZOS - TRÍCEPS
  'Press Francés con Barra Z': `${B}-EZ-Barbell-Lying-Triceps-Extension_Triceps_720.gif`,
  'Jalón de Tríceps con Cuerda': `${B}-Cable-Rope-Pushdown_Triceps_720.gif`,
  'Patada de Tríceps': `${B}-Dumbbell-Kickback_Triceps_720.gif`,
  'Extensiones de Tríceps sobre la Cabeza': `${B}-Dumbbell-Overhead-Triceps-Extension_Triceps_720.gif`,
  'Fondos en Paralelas': `${B}-Chest-Dip_Triceps_720.gif`,

  // CORE
  'Abdominales en Polea Alta (Crunch)': `${B}-Cable-Crunch_Abs_720.gif`,
  'Crunch Declinado': `${B}-Decline-Crunch_Abs_720.gif`,
  'Russian Twist con Disco': `${B}-Russian-Twist_Abs_720.gif`,
  'Elevaciones de Piernas Colgado': `${B}-Hanging-Leg-Raise_Abs_720.gif`,
  'Plancha Isométrica con Lastre': `${B}-Weighted-Front-Plank_Abs_720.gif`,
  'Rueda Abdominal': `${B}-Ab-Wheel_Abs_720.gif`,
  'Woodchoppers en Polea': `${B}-Cable-Woodchop_Abs_720.gif`,

  // TRAPECIO
  'Encogimientos con Barra': `${B}-Barbell-Shrug_Traps_720.gif`,
  'Encogimientos con Mancuernas': `${B}-Dumbbell-Shrug_Traps_720.gif`,

  // ANTEBRAZOS
  'Curl de Antebrazo Supino': `${B}-Barbell-Wrist-Curl-Forearms_720.gif`,
  'Farmer Walk': `${B}-Farmer-Carry_Forearms_720.gif`,

  // GLÚTEOS
  'Patada de Glúteo en Polea': `${B}-Cable-Glute-Kickback_Thighs_720.gif`,
  'Puente de Glúteos con Barra': `${B}-Barbell-Glute-Bridge_Thighs_720.gif`,

  // CARDIO
  'Mountain Climbers': `${B}-Mountain-Climber_Cardio_720.gif`,
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
    let gifUrl = gifMap[ex.name];

    if (!gifUrl) {
      // Intentar coincidencia parcial como fallback
      const key = Object.keys(gifMap).find(k =>
        ex.name.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(ex.name.toLowerCase())
      );
      if (key) gifUrl = gifMap[key];
    }

    if (!gifUrl) {
      notFound.push(ex.name);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('exercises')
      .update({ image_url: gifUrl })
      .eq('id', ex.id);

    if (updateError) {
      console.error(`❌ Error actualizando "${ex.name}":`, updateError.message);
      skipped++;
    } else {
      console.log(`✅ "${ex.name}" → GIF asignado`);
      updated++;
    }

    await new Promise(r => setTimeout(r, 80));
  }

  console.log('\n📋 RESUMEN:');
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   ⏭️  Sin coincidencia: ${skipped}`);
  if (notFound.length > 0) {
    console.log(`\n   ⚠️  Ejercicios sin GIF:`);
    notFound.forEach(name => console.log(`      - ${name}`));
  }
  console.log('\n🎉 Listo! Los GIFs ahora aparecerán en el catálogo del coach y en la vista del cliente.');
}

main().catch(console.error);
