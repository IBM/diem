import gulp from 'gulp';

import shell from 'gulp-shell';

gulp.task('aot-ts', shell.task([
    'aot-fixer-pug --src-path src/',
]));

gulp.task('default', () => {
    gulp.watch('./src/**/*.pug', gulp.series('aot-ts'));
});
