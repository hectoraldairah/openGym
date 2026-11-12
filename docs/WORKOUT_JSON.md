# Importar entrenamientos en JSON

En **Historial → Importar entrenamientos desde JSON**, selecciona un archivo `.json` o
pega su contenido. Revisa la vista previa y pulsa **Importar** para añadirlo al historial.
El botón **Usar JSON de ejemplo** prepara un ejemplo editable con la fecha actual.

## Formatos aceptados

- Un workout individual con `name`, `d` y `entries`.
- Una lista de workouts: `[workout1, workout2]`.
- Un objeto `{ "unit": "kg", "workouts": [...] }`.
- Un respaldo de openGym: se leen sus `workouts`, `unit` y los ejercicios de `customEx`
  que necesiten; no se reemplazan rutinas, ajustes, notas ni el entrenamiento en curso.

## Ejemplo

`0025` es el ID de **barbell bench press** en el catálogo de openGym.

```json
{
  "unit": "kg",
  "workouts": [
    {
      "id": "bench-2026-11-12",
      "name": "Pecho y tríceps",
      "d": "2026-11-12",
      "entries": [
        {
          "id": "0025",
          "target": { "mode": "reps", "sets": 2, "reps": 10, "weight": 60 },
          "sets": [
            { "w": 60, "r": 10, "done": true, "rir": 2 },
            { "w": 60, "r": 8, "done": true, "rir": 1 }
          ]
        }
      ]
    }
  ]
}
```

### Campos

| Campo | Descripción |
| --- | --- |
| `unit` | `kg` o `lb`, en el objeto contenedor. Si se omite, se usa la unidad de tu perfil. |
| `name` | Nombre del entrenamiento. Obligatorio. |
| `d` | Fecha válida `YYYY-MM-DD`. Obligatoria. |
| `id` | ID estable del workout. Opcional; ayuda a detectar importaciones repetidas. |
| `start`, `end` | Marcas de tiempo Unix en **milisegundos**. Opcionales; sin ellas no se inventa una duración. |
| `bw` | Peso corporal de esa sesión, en la unidad del archivo. Opcional. |
| `entries` | Ejercicios y sus series. Obligatorio. |
| `entries[].id` | ID del ejercicio del catálogo o de un ejercicio personalizado. |
| `entries[].target` | Configuración prescrita de la sesión. Opcional. |
| `entries[].topW` | Peso de trabajo confirmado. Opcional. |
| `sets[].done` | Si la serie se completó. Se asume `true` cuando se omite. |

Las medidas deben ser números, no texto. Cada sesión debe tener al menos una serie completada.
`routineId` se deja vacío para no vincular el entrenamiento a una rutina de otra cuenta.
El volumen y los récords de peso del entrenamiento importado se calculan a partir de los datos.

### Tipos de serie

- **Repeticiones:** `{ "w": 60, "r": 10, "done": true }`.
- **Peso corporal:** `{ "w": 0, "r": 15, "done": true }`.
- **Tiempo:** `{ "w": 0, "sec": 45, "done": true }`, con `target.mode: "time"`.
- **Cardio:** `{ "min": 20, "speed": 8, "done": true }`, con `target.mode: "cardio"`.

Si se omite el modo, se deduce de los campos de la primera serie. Todas las series de esa
entrada deben usar el mismo tipo. `speed` está en km/h; no se convierte al cambiar kg/lb.
Las series de repeticiones pueden incluir `rir` (0–10) o `rpe` (6–10).
Las repeticiones unilaterales se registran como **total de ambos lados**, igual que en la app.

### Holds: Side plank de 40 o 50 segundos

El botón **Usar ejemplo de ejercicio por tiempo** prepara un Side plank con dos series,
una de 40 segundos y otra de 50. La vista previa muestra ambas duraciones antes de importar.

```json
{
  "customEx": [{ "id": "side-plank", "n": "Side plank", "bp": "waist" }],
  "workouts": [{
    "name": "Isométricos de core",
    "d": "2026-11-12",
    "entries": [{
      "id": "side-plank",
      "target": { "mode": "time", "bodyweight": true, "sets": 2, "sec": 40 },
      "sets": [
        { "sec": 40, "w": 0, "done": true },
        { "sec": 50, "w": 0, "done": true }
      ]
    }]
  }]
}
```

`target.sec` es el objetivo planeado; `sets[].sec` es el tiempo real de cada serie.
Los segundos no se convierten en repeticiones ni aportan al volumen de peso × repeticiones.

### Ejercicios personalizados

Si el ejercicio no existe en tu catálogo, incluye su definición en `customEx` junto a `workouts`:

```json
{
  "unit": "kg",
  "customEx": [
    { "id": "my-hip-thrust", "n": "Hip thrust en mi máquina", "bp": "glutes" }
  ],
  "workouts": [
    {
      "name": "Glúteos",
      "d": "2026-11-12",
      "entries": [
        { "id": "my-hip-thrust", "sets": [{ "w": 40, "r": 12 }] }
      ]
    }
  ]
}
```

También puedes poner `n` y `bp` directamente en la entrada del ejercicio.
Los valores internos de `bp` son `back`, `cardio`, `chest`, `lower arms`, `lower legs`,
`neck`, `shoulders`, `upper arms`, `upper legs`, `waist` y `glutes`.
`waist` aparece como Core en la interfaz y `upper legs` como Piernas.

## Duplicados y unidades

- Los IDs ya presentes se omiten; no se sobrescriben entrenamientos existentes.
- También se detectan sesiones con el mismo contenido, aunque falte el ID.
- Se permiten varias sesiones diferentes el mismo día.
- Los pesos se convierten a la unidad del perfil si el archivo declara otra unidad.
- Solo las series completadas aportan volumen y sugerencias de peso.
