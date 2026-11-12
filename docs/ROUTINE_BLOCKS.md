# Bloques opcionales antes y después de una rutina

Cada rutina conserva su lista principal de ejercicios y puede tener dos bloques adicionales:

1. **Pre-entrenamiento:** movilidad, calentamiento o preparación.
2. **Entrenamiento principal:** los ejercicios habituales.
3. **Post-entrenamiento:** estiramientos o vuelta a la calma.

## Configurar Lower A

En **Plan → Lower A**, activa **Pre-entrenamiento** y agrega, por ejemplo, un ejercicio
personalizado “Hip mobility”. Activa **Post-entrenamiento** y agrega tus estiramientos.
Cada bloque tiene sus propios ejercicios, series, repeticiones o segundos y superseries.

Al desactivar un bloque se conserva su configuración, pero no se incluye en la sesión.
Las rutinas existentes no necesitan cambios: sin bloques opcionales funcionan como antes.

## Entrenar

Después de registrar tu peso corporal, si hay bloques opcionales configurados, puedes elegir
cuáles incluir **solo por hoy**. Esta selección no modifica la rutina guardada.

La sesión se organiza en orden **Pre → Principal → Post**. Los botones de bloque permiten
navegar entre ellos; los temporizadores y el registro de series funcionan igual que en el
bloque principal. En los bloques opcionales, la progresión está desactivada de forma
predeterminada para mantener la movilidad y los estiramientos tal como los configuraste.

El historial guarda la fase de cada ejercicio y los detalles de la sesión muestran sus bloques.
Las cargas y el historial de calentamiento no sustituyen la progresión del bloque principal.

## Formato guardado y planes compartidos

La lista principal sigue siendo `ex`. `pre` y `post` son opcionales:

```json
{
  "id": "lower-a",
  "name": "Lower A",
  "ex": [
    { "id": "0025", "sets": 3, "reps": 10, "weight": 60 }
  ],
  "pre": {
    "enabled": true,
    "ex": [
      { "id": "hip-mobility", "mode": "time", "sets": 1, "sec": 40, "bodyweight": true, "prog": "off" }
    ]
  },
  "post": {
    "enabled": false,
    "ex": [
      { "id": "stretch", "mode": "time", "sets": 1, "sec": 50, "bodyweight": true, "prog": "off" }
    ]
  }
}
```

Los IDs de ejemplo deben corresponder a ejercicios de tu catálogo o a definiciones incluidas
en `customEx` del archivo de plan. Los planes exportados conservan los bloques desactivados
y sus ejercicios personalizados para poder reactivarlos después de importarlos.

En las sesiones guardadas, cada entrada lleva `phase: "pre"`, `"main"` o `"post"`.
El importador de workouts JSON conserva ese campo; los archivos anteriores se consideran
entrenamientos del bloque principal.
