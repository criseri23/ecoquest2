# Probar EcoQuest en otra computadora

Copiá o descargá el proyecto completo, con `Frontend`, `backend` y todas las imágenes de `Frontend/img/carpinchos`. Extraé el ZIP antes de abrirlo. Necesitás el SDK de .NET 10.

Desde la carpeta del proyecto:

```powershell
dotnet run --project backend/EcoQuestAPI/EcoQuestAPI.csproj
```

Abrí `http://localhost:5228/pages/inicio.html`. Usá el servidor, no doble clic en el HTML. La cámara necesita permiso del navegador; en celulares necesita HTTPS. La IA mantiene su configuración de clave en el backend.

Si no se mueven los carpinchos, entrá en **Config → Animaciones de los carpinchos → Activadas**. La opción automática respeta la reducción de movimiento del sistema operativo. Las imágenes se precargan y se omiten los cuadros que no se hayan podido descargar.

En escaneo, desplazá el panel central para ver todo el resultado y el botón Abrir mapa. El encabezado y la navegación permanecen visibles.

En el mapa, **Mi ubicación** y **Buscar cercano** eligen el punto compatible más cercano y reemplazan un destino anterior. Sin residuos pendientes se buscan lugares para reciclables. Para conservar un destino mientras actualizás la posición al verificar, la validación mantiene la selección explícita.

## Datos del mapa

Cobertura: **Ciudad Autónoma de Buenos Aires**. No incluye automáticamente los puntos de otros municipios. El GPS de una computadora puede tener poca precisión: el círculo azul muestra ese margen.

`Frontend/data/recycling-points.json` contiene la copia oficial del 25/09/2026: 4.369 contenedores verdes de BA Data, 1.000 negros de la capa disponible de EPOK y 19 Puntos Verdes con atención. EPOK devuelve solamente los primeros 1.000 contenedores por capa; por eso los verdes se toman del archivo completo de BA Data. No se afirma cobertura completa de contenedores negros.

La capa de datos C# incluye ese mismo archivo como recurso de compilación. Usa la copia completa para verdes y consulta EPOK para negros y Puntos Verdes. Si falla una capa, conserva la copia de esa capa sin descartar las demás. Si la API local no responde, el frontend usa la copia incluida y avisa; no habilita la validación de XP en ese modo.

Los verdes no se actualizan automáticamente en cada visita. Para actualizar la copia (solo mantenimiento):

```powershell
python -m pip install pyproj
python scripts/update-recycling-catalog.py
dotnet build backend/EcoQuest.sln
```

Reiniciá el backend después de actualizar. El script lee la proyección del archivo SHP oficial y convierte las coordenadas del CSV a latitud/longitud. La transformación se contrastó con los 4.369 puntos del KML oficial (diferencia máxima menor a 1 cm). IDs estables basados en dirección y coordenadas.

Fuentes y atribución: Gobierno de la Ciudad de Buenos Aires, [BA Data: infraestructura de gestión de residuos](https://data.buenosaires.gob.ar/dataset/infraestructura-gestion-residuos) (Creative Commons Attribution) y [EPOK](https://epok.buenosaires.gob.ar/). Las URL exactas de descarga y fecha están en el JSON. Los datos oficiales pueden quedar desactualizados respecto de cambios en la calle.

## Pruebas

```powershell
dotnet run --project tests/MapTests/Tests.csproj
```

Las pruebas del navegador requieren Node.js, Playwright y Edge. Iniciá el servidor en `http://localhost:5239` o definí `ECOQUEST_TEST_URL` con tu URL, instalá Playwright en tu entorno y ejecutá `node tests/frontend-regressions.cjs`. Usan cámara y respuesta de IA simuladas, prueban desplazamiento en cuatro tamaños, preferencias de movimiento, ubicación cercana y caída de la API.
