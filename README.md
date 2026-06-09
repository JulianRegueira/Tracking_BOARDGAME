# Tracker de Comandante - V4 con selección de comandante

App web/PWA para que cada jugador lleve en su propio celular:

- Nombre del jugador
- Selección de comandante
- Vida, ataque y defensa iniciales automáticos según el comandante
- Comandante bloqueado una vez iniciada la partida
- Reiniciar partida manteniendo el mismo comandante
- Instalación como app en el celular
- Guardado automático local

## Cómo editar comandantes

Abrí el archivo `commanders.js` y modificá la lista:

```js
const COMMANDERS = [
  {
    id: "rey-exiliado",
    name: "Rey Exiliado",
    life: 32,
    attack: 2,
    defense: 1,
    color: "gold"
  }
];
```

Campos:

- `id`: identificador único, sin espacios.
- `name`: nombre visible.
- `life`: vida inicial.
- `attack`: ataque inicial.
- `defense`: defensa inicial.
- `color`: color visual. Opciones sugeridas: `gold`, `red`, `blue`, `violet`, `black`, `white`.

## Publicación en GitHub Pages

Subí estos archivos a la raíz del repositorio:

- index.html
- styles.css
- commanders.js
- app.js
- manifest.json
- service-worker.js
- icons/

Luego en GitHub:

1. Settings
2. Pages
3. Source: Deploy from a branch
4. Branch: main
5. Folder: /root
6. Save

URL esperada:

https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/
