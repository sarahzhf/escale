# Pages souples du carnet

`vendor/pagecurl.js` est construit à partir de `pagecurl.src.js` :

```
npm i three@0.170.0 html-to-image@1.11.11 esbuild@0.24.0
npx esbuild pagecurl.src.js --bundle --format=esm --minify --target=es2019,safari14 --legal-comments=eof --outfile=../../vendor/pagecurl.js
```

Le module n'est chargé qu'à l'ouverture d'un carnet. Si le WebGL n'est pas disponible, le carnet utilise l'animation CSS (perspectiveLeft / perspectiveRight).
