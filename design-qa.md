# Design QA - Inicio EcoQuest

Source visual: attached clean forest path background without fixed capybaras.

Checked implementation:
- `Frontend/pages/inicio.html`
- `Frontend/css/escanear.css`
- `Frontend/js/inicio.js`
- `Frontend/img/pantallainicio-base.png`
- `Frontend/img/carpinchos/*.png`

Result:
- The home screen now uses the existing forest path art as a level map.
- It has a compact top resource bar, level nodes, mascot decorations, and the existing bottom navigation.
- The level nodes are real links to the app sections.
- `inicio.js` reads local progress and updates XP, streak and unlocked/current levels.
- Page returns HTTP 200 from `http://localhost:5228/pages/inicio.html`.
- `node --check Frontend/js/inicio.js` passes.
- The three background capybaras are now animated with cropped transparent frames from the supplied pose sheet.
- The home now uses the supplied clean background directly, without the earlier generated erasing pass.
- Browser QA confirmed all images load, the capybara frames change over time, the bottom navigation links remain intact, and the console has no JavaScript errors.

Known small differences:
- It reuses the project's current image assets instead of creating new exact game sprites.
- This keeps the project simpler and easier to explain as a student-built progressive web app.
- The animated capybaras are placed over the clean background at the top-right bag area, the right-side kayak area, and the lower-left fence area.

final result: passed
