// Generated on 2018-08-16 using generator-mendix 2.2.3 :: git+https://github.com/mendix/generator-mendix.git
/*jshint -W069,-W097*/
"use strict";

// In case you seem to have trouble starting Mendix through `gulp modeler`, you might have to set the path to the Mendix application, otherwise leave both values as they are
var MODELER_PATH = null;
var MODELER_ARGS = "/file:{path}";

/********************************************************************************
 * Do not edit anything below, unless you know what you are doing
 ********************************************************************************/
var gulp = require("gulp"),
    zip = require("gulp-zip"),
    del = require("del"),
    newer = require("gulp-newer"),
    gutil = require("gulp-util"),
    plumber = require("gulp-plumber"),
    gulpif = require("gulp-if"),
    jsonTransform = require("gulp-json-transform"),
    intercept = require("gulp-intercept"),
    argv = require("yargs").argv,
    widgetBuilderHelper = require("widgetbuilder-gulp-helper"),
    jsValidate = require("gulp-jsvalidate");

var pkg = require("./package.json"),
    paths = widgetBuilderHelper.generatePaths(pkg),
    xmlversion = widgetBuilderHelper.xmlversion;

gulp.task("default", ['build'], function() {
    gulp.watch("./src/**/*", ["compress"]);
    gulp.watch("./src/**/*.js", ["copy:js"]);
    gulp.watch("./src/**/*.html", ["copy:html"])
});

gulp.task("clean", function () {
    return del([
        paths.WIDGET_TEST_DEST,
        paths.WIDGET_DIST_DEST
    ], { force: true });
});

gulp.task("compress", ["clean"], function () {
    return gulp.src("src/**/*")
        .pipe(zip(pkg.name + ".mpk"))
        .pipe(gulp.dest(paths.TEST_WIDGETS_FOLDER))
        .pipe(gulp.dest("dist"));
});

gulp.task("copy:js", function () {
    return gulp.src(["./src/**/*.js"])
        .pipe(plumber(function (error) {
            var msg = gutil.colors.red("Error");
            if (error.fileName) {
                msg += gutil.colors.red(" in ") + gutil.colors.cyan(error.fileName);
            }
            msg += " : " + gutil.colors.cyan(error.message);
            gutil.log(msg);
            this.emit("end");
        }))
        .pipe(jsValidate())
        .pipe(newer(paths.TEST_WIDGETS_DEPLOYMENT_FOLDER))
        .pipe(gulp.dest(paths.TEST_WIDGETS_DEPLOYMENT_FOLDER));
});

gulp.task("copy:html", function () {
    return gulp.src(["./src/**/*.html"])
        .pipe(newer(paths.TEST_WIDGETS_DEPLOYMENT_FOLDER))
        .pipe(gulp.dest(paths.TEST_WIDGETS_DEPLOYMENT_FOLDER));
});

gulp.task("version:xml", function () {
    return gulp.src(paths.PACKAGE_XML)
        .pipe(xmlversion(argv.n))
        .pipe(gulp.dest("./src/"));
});

gulp.task("version:json", function () {
    return gulp.src("./package.json")
        .pipe(gulpif(typeof argv.n !== "undefined", jsonTransform(function(data) {
            data.version = argv.n;
            return data;
        }, 2)))
        .pipe(gulp.dest("./"));
});

gulp.task("icon", function (cb) {
    var icon = (typeof argv.file !== "undefined") ? argv.file : "./icon.png";
    console.log("\nUsing this file to create a base64 string: " + gutil.colors.cyan(icon));
    gulp.src(icon)
        .pipe(intercept(function (file) {
            console.log("\nCopy the following to your " + pkg.name + ".xml (after description):\n\n" + gutil.colors.cyan("<icon>") + file.contents.toString("base64") + gutil.colors.cyan("<\/icon>") + "\n");
            cb();
        }));
});

gulp.task("folders", function () {
    paths.showPaths(); return;
});

gulp.task("modeler", function (cb) {
    widgetBuilderHelper.runmodeler(MODELER_PATH, MODELER_ARGS, paths.TEST_PATH, cb);
});

gulp.task("build", ["compress"]);
gulp.task("version", ["version:xml", "version:json"]);