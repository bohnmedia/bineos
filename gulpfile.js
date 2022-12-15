const fs = require("fs");
const gulp = require("gulp");
const minify = require("@node-minify/core");
const uglifyjs = require("@node-minify/uglify-js");

gulp.task("generateJs", () => {
  const src = ["src/Bineos.js", "src/BineosRequest.js", "src/BineosPlacement.js", "src/BineosTemplate.js", "src/BineosPlacementFunctions.js"];
  for (const i in src) src[i] = fs.readFileSync(src[i]);
  fs.writeFileSync("dist/bineos.js", src.join("\n"));
  minify({
    compressor: uglifyjs,
    input: "dist/bineos.js",
    output: "dist/bineos.min.js",
    options: {
      output: { comments: /^\*/ },
    },
  });
  return Promise.resolve();
});

gulp.task("watchJs", () => {
  gulp.watch("src/*.js", gulp.series(["generateJs"]));
});

gulp.task("default", gulp.series(["generateJs", "watchJs"]));
