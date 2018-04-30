'use strict';

/* ================================================================
   Plugins
   ================================================================ */

// Base plugins
const gulp = require('gulp'),
      gutil = require('gulp-util');

// Helper plugins
const rename = require('gulp-rename'),
      notify = require("gulp-notify"),
      plumber = require('gulp-plumber'),
      wait = require('gulp-wait'),
      sourcemaps = require('gulp-sourcemaps');

// SASS/CSS plugins
const sass = require('gulp-sass'),
      cssmin = require('gulp-cssmin'),
      autoprefixer = require('gulp-autoprefixer');

// JS plugins
const concat = require('gulp-concat'),
      babel = require('gulp-babel'),
      jshint = require('gulp-jshint'),
      uglify = require('gulp-uglify');

// Imagemin
const imagemin = require('gulp-imagemin');

// Browsersync
const browserSync = require('browser-sync').create(),
      reload = browserSync.reload;

// Nunjucks templating
const nunjucksRender = require('gulp-nunjucks-render');





/* ================================================================
   Configs and Variables
   ================================================================ */

// Error Handling
var onError = function (err) {
    this.emit('end');
};

// Success Message
// Date Variable
var date = new Date(),
    notifyGeneric = {
    title: function () {
          return '<%= file.relative %>';
      },
      onLast: true,
      subtitle: "Successfully Compiled",
      message: "Successfully Compiled @ <%= options.hour %>:<%= options.minute %>:<%= options.second %> ",
      templateOptions: {
          hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds()
      }
    };





/* ================================================================
   Base Tasks
   ================================================================ */

// SASS - Sourcemap and compile
gulp.task('sass', function() {
    return gulp.src('assets/src/scss/*.scss')
        .pipe(plumber())
        .pipe(wait(1000))
        .pipe(sourcemaps.init())
            .pipe(sass().on('error', notify.onError("Error: <%= error.message %>")))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('assets/src/css'))
});


// Main CSS - Autoprefix, minify, and rename
gulp.task('build-css', function() {
    return gulp.src('assets/src/css/main.css')
        .pipe(plumber({ errorHandler: onError }))
        .pipe(autoprefixer({
            browsers: ['last 6 versions'],
            cascade: false
        }))
        .pipe(cssmin())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('assets/dist/css'))
        .pipe(notify(notifyGeneric))
        .pipe(reload({stream: true}));
});


// Global JS - Concatenate, babel, minify, and rename
gulp.task('global-scripts', function() {
    return gulp.src(['assets/src/js/globals/plugins.js', 'assets/src/js/globals/*.js'])
        .pipe(plumber({ errorHandler: onError }))
        .pipe(concat('all.js'))
        .pipe(babel({ compact:false }))
        .on('error', notify.onError("Error: <%= error.message %>"))
        .pipe(gulp.dest('assets/dist/js'))
        .pipe(rename('all.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('assets/dist/js'))
        .pipe(notify(notifyGeneric))
        .pipe(reload({stream: true}));
});


// Individual JS - Concatenate, babel, minify, and rename
gulp.task('individual-scripts', function() {
    return gulp.src(['assets/src/js/individual/*.js'])
        .pipe(plumber({ errorHandler: onError }))
        .pipe(babel({ compact:false }))
        .on('error', notify.onError("Error: <%= error.message %>"))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('assets/dist/js'))
        .pipe(notify(notifyGeneric))
        .pipe(reload({stream: true}));
});


// Images - minification
gulp.task('images', function() {
    return gulp.src('assets/src/images/**/*')
        .pipe(imagemin())
        .pipe(notify(notifyGeneric))
        .pipe(gulp.dest('assets/dist/images'))
});


// HTML - Templating
gulp.task('nunjucks', function() {
  return gulp.src('assets/src/templates/**/*.html')
    .pipe(nunjucksRender({
        path: ['assets/src/templates']
    }))
    .pipe(gulp.dest('templates'))
    .pipe(reload({stream: true}));
});





/* ================================================================
   Run Tasks
   ================================================================ */


// Base Watch Function
var mainWatch = function () {
    gulp.watch('assets/src/scss/**/*.scss', ['sass']);
    gulp.watch('assets/src/css/main.css', ['build-css']);
    gulp.watch('assets/src/js/**/*.js', ['global-scripts', 'individual-scripts']);
    gulp.watch('assets/src/images/*', ['images']);
    gulp.watch(["assets/src/templates/**/*.html"], ['nunjucks']);
    gulp.watch(["assets/src/templates/pages/*.html"], ['nunjucks']);
};


// Browser Sync and Watch
gulp.task('serve', ['sass', 'build-css', 'global-scripts', 'individual-scripts', 'images', 'nunjucks'], function() {
    browserSync.init({
        ui: {
            port: 8080
        },
        server: {
            baseDir:["./","templates"]
            //directory:true
        },
        files: "assets/dist/css/main.min.css"
    });

    mainWatch();

    gulp.watch("assets/dist/**/*.html").on('change', reload);
});


// Compile only Task (No browsersync)
gulp.task('default', ['sass', 'build-css', 'global-scripts', 'individual-scripts', 'images'], function(){
    mainWatch();
});


// Watch only Task (No browsersync or initial build)
gulp.task('watch', function(){
    mainWatch();
});