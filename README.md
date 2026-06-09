# Tracker de Comandantes

App web/PWA sencilla para trackear vida, ataque y defensa de cada jugador en una partida del juego de mesa de comandantes.

## Funciones de la V1

- Agregar hasta 8 jugadores.
- Editar nombre del jugador y comandante.
- Trackear vida, ataque y defensa.
- Botones rápidos de daño y curación.
- Reset rápido de ataque/defensa.
- Notas por jugador para estados como maldito, protegido, aturdido, etc.
- Guardado automático en el celular usando localStorage.
- Exportar/importar partida en JSON.
- PWA instalable y con soporte offline básico.

## Cómo probar localmente

Podés abrir `index.html` directamente en el navegador.

Para probar mejor el modo PWA/offline, levantá un servidor local:

```bash
python -m http.server 8080
```

Luego abrí:

```text
http://localhost:8080
```

## Cómo subirlo a GitHub Pages

1. Creá un repositorio en GitHub, por ejemplo: `comandantes-tracker`.
2. Subí todos estos archivos a la raíz del repositorio.
3. Entrá en `Settings` → `Pages`.
4. En `Build and deployment`, elegí `Deploy from a branch`.
5. Seleccioná la rama `main` y la carpeta `/root`.
6. Guardá los cambios.
7. GitHub te dará una URL pública para abrir la app desde el celular.

## Próximas mejoras posibles

- Modo mesa con vista horizontal.
- Historial de daño por turno.
- Recursos por color: rojo, azul, amarillo, blanco y negro.
- Estado fantasma cuando un jugador muere.
- Turn tracker.
- Botón para aplicar daño calculando ataque contra defensa.
- Sincronización entre varios celulares usando Firebase o Supabase.
