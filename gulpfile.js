/*jslint node: true, nomen:true*/
/*env:node*/
(function () {
    "use strict";
    require("dotenv").config({"silent": true});
    const gulp = require("gulp");
    const argv = require("yargs").argv;
    const browserify = require("browserify");
    const cond = require("gulp-cond");
    const gutil = require("gulp-util");
    const fs = require("fs");
    const fse = require("fs-extra");
    const uglify = require("gulp-uglify");
    const imagemin = require("gulp-imagemin");
    const rename = require("gulp-rename");
    const cssnano = require("cssnano");
    const cache = require("gulp-cache");
    const postcss = require("gulp-postcss");
    const runSequence = require("run-sequence");
    const watchify = require("watchify");
    const buffer = require("vinyl-buffer");
    const source = require("vinyl-source-stream");
    const sourcemaps = require("gulp-sourcemaps");
    const sass = require("gulp-sass");
    const babelify = require("babelify");
    const envify = require("gulp-envify");
    const vueify = require("vueify");
    const eslint = require("gulp-eslint");
    const plumber = require("gulp-plumber");
    const path = require("path");
    const cssnext = require("postcss-cssnext");
    const cssUglifier = [
        cssnano()
    ];
    let currentContext = "";
    let browserifyInstance;
    let modulePath = "./";
    let isProd;

    vueify.compiler.applyConfig({
        "postcss": []
    });

    process.env.NODE_ENV = argv.prod ? "production" : "development";
    isProd = process.env.NODE_ENV === "production";
    let methods = {
        "bundleJS": function () {
            if (isProd) {
                fse.remove(path.join(modulePath, "dist/js/bundle.js.map"));
            }

            browserifyInstance.bundle()
                .on("error", function (err) {
                    gutil.log(err);
                })
                .pipe(source(path.join(modulePath, "src/js/main.js")))
                .pipe(cond(!isProd, plumber()))
                .pipe(buffer())
                .pipe(rename("bundle.js"))
                .pipe(cond(isProd, uglify()))
                .pipe(cond(!isProd, sourcemaps.init({"loadMaps": true})))
                .pipe(cond(!isProd, sourcemaps.write("./")))
                .pipe(gulp.dest(path.join(modulePath, "dist/js/")));
            return isProd ? gutil.log("FINISHED PRODUCTION BUILD") : gutil.log("FINISHED DEV BUILD");
        }
    };

    gulp.task("build", function () {
        if (argv.w || argv.watch) {
            runSequence("lint", "js", "css", "watch-css");
        } else {
            runSequence("lint", "js", "css");
        }
    });

    gulp.task("js", function () {
        browserifyInstance = browserify({
            "entries": path.join(modulePath, "src/js/main.js"),
            "noParse": ["vue.js"],
            "read": false,
            "standalone": "JngVueChat",
            "plugin": argv.w || argv.watch ? [watchify] : [],
            "cache": {},
            "packageCache": {},
            "debug": !isProd
        }).transform("envify", {
            "global": true,
            "NODE_ENV": process.env.NODE_ENV
        })
            .transform(babelify)
            .transform(vueify)
            .on("update", methods.bundleJS);
        return methods.bundleJS();
    });

    gulp.task("css", function () {
        if (isProd) {
            fse.remove(path.join(modulePath, "/dist/css/style.css.map"));
        }
        return gulp.src([path.join(modulePath, "src/css/*.css"), path.join(modulePath, "src/css/*.scss")])
            .pipe(plumber())
            .pipe(postcss([
                cssnext({})
            ]))
            .pipe(cond(!isProd, sourcemaps.init({"loadMaps": true})))
            .pipe(sass().on('error', sass.logError))
            .pipe(cond(isProd, postcss(cssUglifier)))
            .pipe(cond(!isProd, sourcemaps.write("./")))
            .pipe(gulp.dest(path.join(modulePath, "/dist/css/")))
    });



    gulp.task("watch-css", function () {
        return gulp.watch([path.join(modulePath, "src/css/*.css"), path.join(modulePath, "src/css/*.scss")], ['css']);
    });

    gulp.task("lint", function () {
        return gulp.src([[modulePath, "src/js/**/*.js"].join(""), [modulePath, "src/js/**/*.vue"].join("")])
            .pipe(eslint())
            .pipe(eslint.format())
            .pipe(eslint.failAfterError());
    });

    gulp.task("images", function () {
        return gulp.src("public/images/disclaimer/*.+(png|jpg|jpeg|gif|svg)").pipe(cache(imagemin())).pipe(gulp.dest("public/images/disclaimer/dist"));
    });

    gulp.task("help", function () {
        /*
         params to doc
         @ watch, alias w -> #build
         @ prod -> #env
         @ bluemix, alias bx -> #generate-sw
         @ module, alias m -> #build
         @ override, alias o -> #create-module
         */

        gutil.log(gutil.colors.green("Task: build"), gutil.colors.magenta('#'));
        gutil.log(gutil.colors.green("Task: lint"), gutil.colors.magenta('#'));
        gutil.log(gutil.colors.green("Task: js"), gutil.colors.magenta('#'));
        gutil.log(gutil.colors.green("Task: css"), gutil.colors.magenta('#'));
        gutil.log(gutil.colors.green("Task: images"), gutil.colors.magenta('#'));

    });

    process.on("exit", function(code) {
        gutil.log("About to exit with code:", code);
    });

}());
